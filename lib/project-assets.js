import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/db";
import assetRules from "@/lib/project-assets-core.cjs";

export const {
  ALLOWED_PROJECT_ASSET_EXTENSIONS,
  ALLOWED_PROJECT_ASSET_TYPES,
  MAX_PROJECT_ASSET_SIZE,
  PROJECT_ASSET_BUCKET,
  PROJECT_ASSET_SOURCES,
  normalizeAssetDirectory,
  normalizeAssetSearchParams,
  normalizeAssetSource,
  normalizeAssetTags,
  normalizeAssetUpdateInput,
  sanitizeStorageExtension,
  splitRelativeAssetPath,
  validateAssetFileInput
} = assetRules;

function mapProjectAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    storagePath: row.storage_path || "",
    url: getProjectAssetUrl(row.storage_path || ""),
    originalFilename: row.original_filename || "",
    displayName: row.display_name || row.original_filename || "",
    directoryPath: row.directory_path || "",
    mimeType: row.mime_type || "",
    fileSize: Number(row.file_size || 0),
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    source: row.source || "upload",
    altText: row.alt_text || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    metadata: row.metadata || {},
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null
  };
}

function encodeStoragePath(storagePath = "") {
  return storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getProjectAssetUrl(storagePath = "") {
  return storagePath ? `/api/assets/images/${encodeStoragePath(storagePath)}` : "";
}

export function normalizePublicAssetPath(parts = []) {
  const storagePath = parts.map((part) => decodeURIComponent(part)).join("/");
  if (!storagePath || storagePath.includes("..") || storagePath.startsWith("/")) return "";
  return storagePath;
}

export function createProjectAssetStoragePath(source, filename = "image.webp") {
  const safeSource = normalizeAssetSource(source);
  const extension = sanitizeStorageExtension(filename);
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `assets/${safeSource}/${datePrefix}/${Date.now()}-${randomUUID()}.${extension}`;
}

export async function buildProjectAssetUpload(file, input = {}) {
  const validation = validateAssetFileInput(file);
  if (!validation.ok) {
    const error = new Error(validation.code);
    error.code = validation.code;
    throw error;
  }

  const relative = splitRelativeAssetPath(input.relativePath || file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const source = normalizeAssetSource(input.source || (relative.directoryPath ? "folder_upload" : "upload"));
  return {
    buffer,
    storagePath: createProjectAssetStoragePath(source, file.name),
    originalFilename: file.name,
    displayName: relative.filename || file.name,
    directoryPath: relative.directoryPath,
    fileSize: buffer.length,
    mimeType: file.type || "application/octet-stream",
    source,
    width: Number(input.width || 0) || null,
    height: Number(input.height || 0) || null,
    altText: String(input.altText || "").trim(),
    tags: normalizeAssetTags(input.tags),
    metadata: input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {}
  };
}

export async function createProjectAssetRecord(adminUser, input = {}) {
  const pool = getPostgresPool();
  const source = normalizeAssetSource(input.source);
  const tags = normalizeAssetTags(input.tags);
  const result = await pool.query(
    `insert into public.project_assets (
      storage_path,
      original_filename,
      display_name,
      directory_path,
      mime_type,
      file_size,
      width,
      height,
      source,
      alt_text,
      tags,
      metadata,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12::jsonb, $13, $13)
    on conflict (storage_path) do update
    set
      display_name = excluded.display_name,
      directory_path = excluded.directory_path,
      mime_type = excluded.mime_type,
      file_size = excluded.file_size,
      width = excluded.width,
      height = excluded.height,
      source = excluded.source,
      alt_text = excluded.alt_text,
      tags = excluded.tags,
      metadata = excluded.metadata,
      updated_by = excluded.updated_by,
      updated_at = now()
    returning *`,
    [
      String(input.storagePath || ""),
      String(input.originalFilename || input.displayName || "image"),
      String(input.displayName || input.originalFilename || "image").trim(),
      normalizeAssetDirectory(input.directoryPath),
      String(input.mimeType || "application/octet-stream"),
      Number(input.fileSize || 0),
      input.width ? Number(input.width) : null,
      input.height ? Number(input.height) : null,
      source,
      String(input.altText || "").trim(),
      tags,
      JSON.stringify(input.metadata || {}),
      adminUser?.id || null
    ]
  );
  return mapProjectAsset(result.rows[0]);
}

export async function getProjectAsset(assetId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.project_assets
     where id = $1 and archived_at is null
     limit 1`,
    [assetId]
  );
  return mapProjectAsset(result.rows[0]);
}

export async function listProjectAssets(input = {}) {
  const params = normalizeAssetSearchParams(input);
  const filters = ["archived_at is null"];
  const values = [];

  if (params.q) {
    values.push(`%${params.q}%`);
    filters.push(`(
      display_name ilike $${values.length}
      or original_filename ilike $${values.length}
      or directory_path ilike $${values.length}
      or alt_text ilike $${values.length}
      or array_to_string(tags, ' ') ilike $${values.length}
    )`);
  }

  if (params.directoryPath) {
    values.push(params.directoryPath);
    filters.push(`directory_path = $${values.length}`);
  }

  if (params.source) {
    values.push(params.source);
    filters.push(`source = $${values.length}`);
  }

  const where = filters.join(" and ");
  const countValues = [...values];
  values.push(params.limit, params.offset);
  const pool = getPostgresPool();
  const [assetsResult, countResult, directoriesResult] = await Promise.all([
    pool.query(
      `select *
       from public.project_assets
       where ${where}
       order by updated_at desc, created_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values
    ),
    pool.query(
      `select count(*)::int as total
       from public.project_assets
       where ${where}`,
      countValues
    ),
    pool.query(
      `select distinct directory_path
       from public.project_assets
       where archived_at is null and directory_path <> ''
       order by directory_path asc
       limit 120`
    )
  ]);

  return {
    assets: assetsResult.rows.map(mapProjectAsset),
    directories: directoriesResult.rows.map((row) => row.directory_path).filter(Boolean),
    page: params.page,
    limit: params.limit,
    total: Number(countResult.rows[0]?.total || 0)
  };
}

export async function updateProjectAsset(assetId, adminUser, input = {}) {
  const normalized = normalizeAssetUpdateInput(input);
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.project_assets
     set
      display_name = $2,
      alt_text = $3,
      directory_path = $4,
      tags = $5::text[],
      updated_by = $6,
      updated_at = now()
     where id = $1 and archived_at is null
     returning *`,
    [
      assetId,
      normalized.displayName,
      normalized.altText,
      normalized.directoryPath,
      normalized.tags,
      adminUser?.id || null
    ]
  );
  return mapProjectAsset(result.rows[0]);
}

export async function isPublicProjectAssetImage(storagePath) {
  if (!storagePath) return false;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select 1
     from public.site_page_contents spc
     where spc.is_published = true
      and (
        spc.hero_image_path = $1
        or spc.published_content::text like '%' || to_jsonb($1::text)::text || '%'
      )
     union all
     select 1
     from public.documents d
     join public.document_categories dc on dc.key = d.category_key
     join public.document_versions dv on dv.id = d.current_version_id
     where d.is_published = true
      and d.deleted_at is null
      and dc.requires_login_to_view = false
      and dv.markdown_content like '%' || $1 || '%'
     limit 1`,
    [storagePath]
  );

  return Boolean(result.rows[0]);
}
