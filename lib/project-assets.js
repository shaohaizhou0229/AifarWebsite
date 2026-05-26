import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/db";
import assetRules from "@/lib/project-assets-core.cjs";

export const {
  ALLOWED_PROJECT_ASSET_EXTENSIONS,
  ALLOWED_PROJECT_ASSET_TYPES,
  MAX_PROJECT_ASSET_SIZE,
  PROJECT_ASSET_BUCKET,
  PROJECT_ASSET_UPLOAD_CHUNK_SIZE,
  PROJECT_ASSET_SOURCES,
  normalizeAssetBulkInput,
  normalizeAssetDirectory,
  normalizeAssetSearchParams,
  normalizeAssetSource,
  normalizeAssetTagName,
  normalizeAssetTags,
  normalizeAssetUpdateInput,
  normalizeAssetUploadSessionInput,
  normalizeAssetUploadStatusInput,
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

function mapCatalogValue(row, key) {
  return String(row?.[key] || "").trim();
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

async function ensureProjectAssetFolder(adminUser, directoryPath) {
  if (!directoryPath) return null;
  return createProjectAssetFolder(adminUser, {
    directoryPath,
    displayName: directoryPath.split("/").pop() || directoryPath
  });
}

async function ensureProjectAssetTags(adminUser, tags = []) {
  const normalized = normalizeAssetTags(tags);
  for (const tag of normalized) {
    await createProjectAssetTag(adminUser, { name: tag });
  }
  return normalized;
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

function mapProjectAssetUploadSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    storagePath: row.storage_path || "",
    originalFilename: row.original_filename || "",
    displayName: row.display_name || row.original_filename || "",
    relativePath: row.relative_path || "",
    directoryPath: row.directory_path || "",
    mimeType: row.mime_type || "",
    fileSize: Number(row.file_size || 0),
    source: row.source || "upload",
    uploadStatus: row.upload_status || "uploading",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function createProjectAssetUploadSession(adminUser, input = {}) {
  const normalized = normalizeAssetUploadSessionInput(input);
  const storagePath = createProjectAssetStoragePath(normalized.source, normalized.filename);
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.project_asset_upload_sessions (
      storage_path,
      original_filename,
      display_name,
      relative_path,
      directory_path,
      mime_type,
      file_size,
      source,
      upload_status,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, 'uploading', $9, $9)
    returning *`,
    [
      storagePath,
      normalized.filename,
      normalized.displayName,
      normalized.relativePath,
      normalized.directoryPath,
      normalized.contentType,
      normalized.fileSize,
      normalized.source,
      adminUser?.id || null
    ]
  );

  return mapProjectAssetUploadSession(result.rows[0]);
}

export async function updateProjectAssetUploadStatus(sessionId, adminUser, input = {}) {
  const { uploadStatus } = normalizeAssetUploadStatusInput(input);
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.project_asset_upload_sessions
     set upload_status = $2,
         updated_by = $3,
         updated_at = now()
     where id = $1
     returning *`,
    [sessionId, uploadStatus, adminUser?.id || null]
  );
  return mapProjectAssetUploadSession(result.rows[0]);
}

export async function completeProjectAssetUpload(sessionId, adminUser, input = {}) {
  const pool = getPostgresPool();
  const sessionResult = await pool.query(
    `select *
     from public.project_asset_upload_sessions
     where id = $1 and upload_status <> 'completed'
     limit 1`,
    [sessionId]
  );
  const session = sessionResult.rows[0];
  if (!session) return null;

  const tags = await ensureProjectAssetTags(adminUser, input.tags);
  await ensureProjectAssetFolder(adminUser, session.directory_path || "");

  const asset = await createProjectAssetRecord(adminUser, {
    storagePath: session.storage_path,
    originalFilename: session.original_filename,
    displayName: session.display_name,
    directoryPath: session.directory_path,
    fileSize: session.file_size,
    mimeType: session.mime_type,
    source: session.source,
    width: Number(input.width || 0) || null,
    height: Number(input.height || 0) || null,
    altText: input.altText,
    tags,
    metadata: {
      uploadSessionId: session.id,
      relativePath: session.relative_path || ""
    }
  });

  await pool.query(
    `update public.project_asset_upload_sessions
     set upload_status = 'completed',
         updated_by = $2,
         updated_at = now()
     where id = $1`,
    [sessionId, adminUser?.id || null]
  );

  return asset;
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

  if (params.tag) {
    values.push(params.tag);
    filters.push(`$${values.length} = any(tags)`);
  }

  const where = filters.join(" and ");
  const queryValues = [...values, params.limit, params.offset];
  const pool = getPostgresPool();
  const client = await pool.connect();
  let assetsResult;
  let countResult;
  let foldersResult;
  let tagsResult;

  try {
    assetsResult = await client.query(
      `select *, count(*) over()::int as total_count
       from public.project_assets
       where ${where}
       order by updated_at desc, created_at desc
       limit $${queryValues.length - 1} offset $${queryValues.length}`,
      queryValues
    );
    if (!assetsResult.rows.length && params.offset > 0) {
      countResult = await client.query(
        `select count(*)::int as total
         from public.project_assets
         where ${where}`,
        values
      );
    }
    foldersResult = await client.query(
      `select directory_path
       from (
        select directory_path
        from public.project_asset_folders
        where archived_at is null and directory_path <> ''
        union
        select distinct directory_path
        from public.project_assets
        where archived_at is null and directory_path <> ''
       ) folders
       order by directory_path asc
       limit 120`
    );
    tagsResult = await client.query(
      `select tag
       from (
        select name as tag
        from public.project_asset_tags
        where archived_at is null and name <> ''
        union
        select distinct unnest(tags) as tag
        from public.project_assets
        where archived_at is null and cardinality(tags) > 0
       ) tags
       where tag <> ''
       order by lower(tag) asc, tag asc
       limit 120`
    );
  } finally {
    client.release();
  }

  const folders = foldersResult.rows.map((row) => mapCatalogValue(row, "directory_path")).filter(Boolean);
  const tags = tagsResult.rows.map((row) => mapCatalogValue(row, "tag")).filter(Boolean);
  const total = assetsResult.rows[0]?.total_count || countResult?.rows[0]?.total || 0;

  return {
    assets: assetsResult.rows.map(mapProjectAsset),
    directories: folders,
    folders,
    tags,
    page: params.page,
    limit: params.limit,
    total: Number(total)
  };
}

export async function createProjectAssetFolder(adminUser, input = {}) {
  const directoryPath = normalizeAssetDirectory(input.directoryPath || input.name || input.displayName);
  if (!directoryPath) {
    throw new Error("Folder name is required.");
  }

  const pool = getPostgresPool();
  const displayName = String(input.displayName || input.name || directoryPath.split("/").pop() || directoryPath).trim();
  const insertResult = await pool.query(
    `insert into public.project_asset_folders (
      directory_path,
      display_name,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $3)
    on conflict do nothing
    returning directory_path, display_name`,
    [directoryPath, displayName, adminUser?.id || null]
  );

  const row = insertResult.rows[0] || (await pool.query(
    `select directory_path, display_name
     from public.project_asset_folders
     where archived_at is null and lower(directory_path) = lower($1)
     limit 1`,
    [directoryPath]
  )).rows[0];

  return {
    directoryPath: row?.directory_path || directoryPath,
    displayName: row?.display_name || displayName
  };
}

export async function createProjectAssetTag(adminUser, input = {}) {
  const name = normalizeAssetTagName(input.name || input.tag);
  if (!name) {
    throw new Error("Tag name is required.");
  }

  const pool = getPostgresPool();
  const insertResult = await pool.query(
    `insert into public.project_asset_tags (
      name,
      created_by,
      updated_by
    )
    values ($1, $2, $2)
    on conflict do nothing
    returning name`,
    [name, adminUser?.id || null]
  );

  const row = insertResult.rows[0] || (await pool.query(
    `select name
     from public.project_asset_tags
     where archived_at is null and lower(name) = lower($1)
     limit 1`,
    [name]
  )).rows[0];

  return {
    name: row?.name || name
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

export async function bulkUpdateProjectAssets(adminUser, input = {}) {
  const normalized = normalizeAssetBulkInput(input);
  const pool = getPostgresPool();
  let result;

  if (normalized.action === "move") {
    await ensureProjectAssetFolder(adminUser, normalized.directoryPath);
    result = await pool.query(
      `update public.project_assets
       set directory_path = $2,
           updated_by = $3,
           updated_at = now()
       where id = any($1::uuid[]) and archived_at is null
       returning *`,
      [normalized.assetIds, normalized.directoryPath, adminUser?.id || null]
    );
  } else if (normalized.action === "tags") {
    const tags = await ensureProjectAssetTags(adminUser, normalized.tags);
    result = await pool.query(
      `update public.project_assets
       set tags = case
            when $2 = 'replace' then $3::text[]
            else (
              select coalesce(array_agg(distinct next_tag order by next_tag), '{}'::text[])
              from unnest(public.project_assets.tags || $3::text[]) as next_tag
            )
           end,
           updated_by = $4,
           updated_at = now()
       where id = any($1::uuid[]) and archived_at is null
       returning *`,
      [normalized.assetIds, normalized.tagMode, tags, adminUser?.id || null]
    );
  } else if (normalized.action === "altText") {
    result = await pool.query(
      `update public.project_assets
       set alt_text = $2,
           updated_by = $3,
           updated_at = now()
       where id = any($1::uuid[]) and archived_at is null
       returning *`,
      [normalized.assetIds, normalized.altText, adminUser?.id || null]
    );
  } else {
    result = await pool.query(
      `update public.project_assets
       set archived_at = now(),
           archived_by = $2,
           updated_by = $2,
           updated_at = now()
       where id = any($1::uuid[]) and archived_at is null
       returning *`,
      [normalized.assetIds, adminUser?.id || null]
    );
  }

  return {
    action: normalized.action,
    updated: result.rows.length,
    assets: result.rows.map(mapProjectAsset)
  };
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
