import { createHash, randomUUID } from "crypto";
import { createPublicSupabaseClient, createUserSupabaseClient } from "@/lib/auth";
import { getPostgresPool } from "@/lib/db";

export const DOCUMENT_BUCKET = "site-documents";
export const MAX_MARKDOWN_FILE_SIZE = 5 * 1024 * 1024;
export const DOCUMENT_CATEGORY_KEYS = [
  "operation_guides",
  "technical_whitepapers",
  "deployment_manuals",
  "feature_lists"
];

const CATEGORY_KEY_SET = new Set(DOCUMENT_CATEGORY_KEYS);

export function sanitizeDocumentCategory(value) {
  return CATEGORY_KEY_SET.has(value) ? value : "";
}

export function normalizeDocumentSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isAllowedMarkdownFilename(filename = "") {
  return filename.toLowerCase().endsWith(".md");
}

export function createDocumentStoragePath(documentId, versionLabel = "v1") {
  const safeVersion = normalizeDocumentSlug(versionLabel) || "v1";
  return `${documentId}/${Date.now()}-${safeVersion}-${randomUUID()}.md`;
}

export function createMarkdownChecksum(markdownContent = "") {
  return createHash("sha256").update(markdownContent, "utf8").digest("hex");
}

function mapCategory(row) {
  return {
    key: row.key,
    label: row.label,
    description: row.description || "",
    sortOrder: Number(row.sort_order || 0),
    requiresLoginToView: Boolean(row.requires_login_to_view),
    allowAuthenticatedDownload: Boolean(row.allow_authenticated_download)
  };
}

function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    categoryKey: row.category_key,
    categoryLabel: row.category_label || "",
    categoryDescription: row.category_description || "",
    requiresLoginToView: Boolean(row.requires_login_to_view),
    allowAuthenticatedDownload: Boolean(row.allow_authenticated_download),
    slug: row.slug,
    title: row.title,
    summary: row.summary || "",
    currentVersionId: row.current_version_id,
    currentVersionLabel: row.current_version_label || "",
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    markdownContent: row.markdown_content || "",
    storagePath: row.storage_path || "",
    originalFilename: row.original_filename || "",
    fileSize: row.file_size ? Number(row.file_size) : null,
    checksumSha256: row.checksum_sha256 || "",
    contentType: row.content_type || "text/markdown",
    versionCreatedAt: row.version_created_at
  };
}

function mapVersion(row) {
  return {
    id: row.id,
    documentId: row.document_id,
    versionLabel: row.version_label || "",
    markdownContent: row.markdown_content || "",
    storagePath: row.storage_path || "",
    originalFilename: row.original_filename || "",
    fileSize: row.file_size ? Number(row.file_size) : null,
    checksumSha256: row.checksum_sha256 || "",
    contentType: row.content_type || "text/markdown",
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export async function listDocumentCategories() {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.document_categories
     order by sort_order, key`
  );
  return result.rows.map(mapCategory);
}

export async function listAdminDocuments(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 50), 1), 100);
  const pool = getPostgresPool();
  const result = await pool.query(
    `select d.*, dc.label as category_label, dc.description as category_description,
      dc.requires_login_to_view, dc.allow_authenticated_download,
      dv.storage_path, dv.original_filename, dv.file_size,
      dv.checksum_sha256, dv.content_type, dv.created_at as version_created_at
     from public.documents d
     join public.document_categories dc on dc.key = d.category_key
     left join public.document_versions dv on dv.id = d.current_version_id
       where d.deleted_at is null
       order by dc.sort_order, d.updated_at desc
       limit $1`,
    [limit]
  );
  return result.rows.map(mapDocument);
}

export async function listPublicDocuments({ includeLoginGated = false } = {}) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select d.*, dc.label as category_label, dc.description as category_description,
      dc.requires_login_to_view, dc.allow_authenticated_download,
      dv.markdown_content, dv.storage_path, dv.original_filename, dv.file_size,
      dv.checksum_sha256, dv.content_type, dv.created_at as version_created_at
     from public.documents d
     join public.document_categories dc on dc.key = d.category_key
     left join public.document_versions dv on dv.id = d.current_version_id
     where d.deleted_at is null
       and d.is_published = true
       and ($1::boolean or dc.requires_login_to_view = false)
     order by dc.sort_order, d.title`,
    [includeLoginGated]
  );
  return result.rows.map(mapDocument);
}

export async function getAdminDocument(documentId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select d.*, dc.label as category_label, dc.description as category_description,
      dc.requires_login_to_view, dc.allow_authenticated_download,
      dv.markdown_content, dv.storage_path, dv.original_filename, dv.file_size,
      dv.checksum_sha256, dv.content_type, dv.created_at as version_created_at
     from public.documents d
     join public.document_categories dc on dc.key = d.category_key
     left join public.document_versions dv on dv.id = d.current_version_id
     where d.id = $1 and d.deleted_at is null`,
    [documentId]
  );
  return mapDocument(result.rows[0]);
}

export async function getPublicDocumentBySlug(slug, { includeLoginGated = false } = {}) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select d.*, dc.label as category_label, dc.description as category_description,
      dc.requires_login_to_view, dc.allow_authenticated_download,
      dv.markdown_content, dv.storage_path, dv.original_filename, dv.file_size,
      dv.checksum_sha256, dv.content_type, dv.created_at as version_created_at
     from public.documents d
     join public.document_categories dc on dc.key = d.category_key
     left join public.document_versions dv on dv.id = d.current_version_id
     where d.slug = $1
       and d.deleted_at is null
       and d.is_published = true
       and ($2::boolean or dc.requires_login_to_view = false)`,
    [slug, includeLoginGated]
  );
  return mapDocument(result.rows[0]);
}

export async function listDocumentVersions(documentId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.document_versions
     where document_id = $1
     order by created_at desc`,
    [documentId]
  );
  return result.rows.map(mapVersion);
}

function splitMarkdownIntoChunks(markdownContent) {
  const lines = String(markdownContent || "").split(/\r?\n/);
  const chunks = [];
  const headings = [];
  let buffer = [];

  function flush() {
    const content = buffer.join("\n").trim();
    if (!content) return;
    const hash = createMarkdownChecksum(content);
    chunks.push({
      chunkIndex: chunks.length,
      headingPath: headings.join(" > "),
      content,
      tokenEstimate: Math.ceil(content.length / 4),
      contentHash: hash
    });
    buffer = [];
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      headings.length = level - 1;
      headings[level - 1] = heading[2].trim();
      buffer.push(line);
      continue;
    }

    buffer.push(line);
    if (buffer.join("\n").length >= 1400) {
      flush();
    }
  }

  flush();
  return chunks;
}

async function replaceVersionChunks(client, versionId, markdownContent) {
  const chunks = splitMarkdownIntoChunks(markdownContent);
  await client.query("delete from public.document_chunks where version_id = $1", [versionId]);

  for (const chunk of chunks) {
    await client.query(
      `insert into public.document_chunks (
        version_id,
        chunk_index,
        heading_path,
        content,
        token_estimate,
        content_hash,
        index_status
      )
      values ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        versionId,
        chunk.chunkIndex,
        chunk.headingPath,
        chunk.content,
        chunk.tokenEstimate,
        chunk.contentHash
      ]
    );
  }
}

export async function saveDocumentVersion(adminUser, input, uploadInfo = {}) {
  const categoryKey = sanitizeDocumentCategory(input.categoryKey);
  const slug = normalizeDocumentSlug(input.slug);
  const title = String(input.title || "").trim();
  const versionLabel = String(input.versionLabel || "").trim();
  const markdownContent = String(input.markdownContent || "");
  const summary = String(input.summary || "").trim();
  const isPublished = Boolean(input.isPublished);

  if (!categoryKey) throw new Error("Document category is required.");
  if (!slug) throw new Error("Document slug is required.");
  if (!title) throw new Error("Document title is required.");
  if (!versionLabel) throw new Error("Version is required.");
  if (!markdownContent.trim()) throw new Error("Markdown content is required.");

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    let documentId = input.id || null;
    if (documentId) {
      const updated = await client.query(
        `update public.documents
         set category_key = $2,
             slug = $3,
             title = $4,
             summary = $5,
             is_published = $6,
             published_at = case
               when $6 and published_at is null then now()
               when $6 then published_at
               else null
             end,
             updated_at = now()
         where id = $1 and deleted_at is null
         returning id`,
        [documentId, categoryKey, slug, title, summary, isPublished]
      );
      if (!updated.rows[0]) throw new Error("Document not found.");
    } else {
      const created = await client.query(
        `insert into public.documents (
          category_key,
          slug,
          title,
          summary,
          is_published,
          published_at,
          created_by,
          updated_at
        )
        values ($1, $2, $3, $4, $5, case when $5 then now() else null end, $6, now())
        returning id`,
        [categoryKey, slug, title, summary, isPublished, adminUser.id]
      );
      documentId = created.rows[0].id;
    }

    const checksumSha256 = createMarkdownChecksum(markdownContent);
    const version = await client.query(
      `insert into public.document_versions (
        document_id,
        version_label,
        markdown_content,
        storage_path,
        original_filename,
        file_size,
        checksum_sha256,
        content_type,
        created_by
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'text/markdown', $8)
      returning *`,
      [
        documentId,
        versionLabel,
        markdownContent,
        uploadInfo.storagePath || null,
        uploadInfo.originalFilename || null,
        uploadInfo.fileSize || Buffer.byteLength(markdownContent, "utf8"),
        checksumSha256,
        adminUser.id
      ]
    );

    await replaceVersionChunks(client, version.rows[0].id, markdownContent);

    const document = await client.query(
      `update public.documents
       set current_version_id = $2,
           current_version_label = $3,
           updated_at = now()
       where id = $1
       returning *`,
      [documentId, version.rows[0].id, versionLabel]
    );

    await client.query("commit");
    return {
      document: mapDocument({
        ...document.rows[0],
        markdown_content: markdownContent,
        storage_path: uploadInfo.storagePath || "",
        original_filename: uploadInfo.originalFilename || "",
        file_size: uploadInfo.fileSize || Buffer.byteLength(markdownContent, "utf8"),
        checksum_sha256: checksumSha256
      }),
      version: mapVersion(version.rows[0])
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function softDeleteDocument(documentId, adminUser) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.documents
     set deleted_at = now(),
         is_published = false,
         published_at = null,
         created_by = $2,
         updated_at = now()
     where id = $1 and deleted_at is null
     returning *`,
    [documentId, adminUser.id]
  );
  return mapDocument(result.rows[0]);
}

export async function uploadMarkdownToStorage(accessToken, documentId, versionLabel, markdownContent, originalFilename) {
  const storagePath = createDocumentStoragePath(documentId || "new", versionLabel);
  const buffer = Buffer.from(markdownContent, "utf8");
  const supabase = createUserSupabaseClient(accessToken);
  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "text/markdown; charset=utf-8",
      upsert: false
    });

  if (error) {
    throw new Error(error.message || "Could not upload markdown file.");
  }

  return {
    storagePath,
    originalFilename,
    fileSize: buffer.length
  };
}

export async function createDocumentDownloadUrl(document, accessToken) {
  if (!document?.storagePath) return "";
  const supabase = accessToken ? createUserSupabaseClient(accessToken) : createPublicSupabaseClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storagePath, 60 * 10, {
      download: document.originalFilename || `${document.slug}.md`
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Could not create document download link.");
  }

  return data.signedUrl;
}
