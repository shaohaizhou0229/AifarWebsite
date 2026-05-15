import { randomUUID, createHash } from "crypto";
import { getPostgresPool } from "@/lib/db";

export const DOWNLOAD_BUCKET = "client-downloads";
export const MAX_RELEASE_FILE_SIZE = 300 * 1024 * 1024;
export const RELEASE_UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024;
export const ALLOWED_RELEASE_EXTENSIONS = new Set(["exe", "msi", "dmg", "pkg", "apk", "zip"]);

export const DOWNLOAD_PLATFORMS = [
  {
    key: "windows",
    title: "PC Client",
    label: "Windows PC",
    description: "Windows desktop client for daily collaboration.",
    action: "Download",
    variant: "primary"
  },
  {
    key: "ios",
    title: "iOS Client",
    label: "iOS",
    description: "Mobile access for iPhone and iPad users.",
    action: "App Store",
    variant: "secondary"
  },
  {
    key: "android_phone",
    title: "Android Phone",
    label: "Android Phone",
    description: "Android client optimized for phone screens.",
    action: "Download APK",
    variant: "secondary"
  },
  {
    key: "android_pad",
    title: "Android Pad",
    label: "Android Pad",
    description: "Tablet-ready Android collaboration experience.",
    action: "Download APK",
    variant: "secondary"
  },
  {
    key: "mac",
    title: "Mac Client",
    label: "Mac",
    description: "Current channel: preview version.",
    action: "Preview",
    variant: "secondary"
  }
];

export const PLATFORM_KEYS = new Set(DOWNLOAD_PLATFORMS.map((platform) => platform.key));

export function getPlatform(platformKey) {
  return DOWNLOAD_PLATFORMS.find((platform) => platform.key === platformKey) || null;
}

function mapRelease(row) {
  if (!row) return null;
  return {
    platform: row.platform,
    version: row.version || "",
    buildNumber: row.build_number || "",
    releaseNotes: row.release_notes || "",
    storagePath: row.storage_path || "",
    externalUrl: row.external_url || "",
    fileSize: row.file_size ? Number(row.file_size) : null,
    checksumSha256: row.checksum_sha256 || "",
    uploadStatus: row.upload_status || "idle",
    originalFilename: row.original_filename || "",
    contentType: row.content_type || "",
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mergePlatform(platform, release) {
  return {
    ...platform,
    release: release || {
      platform: platform.key,
      version: "",
      buildNumber: "",
      releaseNotes: "",
      storagePath: "",
      externalUrl: "",
      fileSize: null,
      checksumSha256: "",
      uploadStatus: "idle",
      originalFilename: "",
      contentType: "",
      isPublished: false,
      publishedAt: null
    }
  };
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizePlatform(value) {
  return PLATFORM_KEYS.has(value) ? value : "";
}

export function getReleaseFileExtension(filename = "") {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

export function isAllowedReleaseFilename(filename = "") {
  return ALLOWED_RELEASE_EXTENSIONS.has(getReleaseFileExtension(filename));
}

export async function listPublicDownloadPlatforms() {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.client_releases
     where is_published = true`
  );
  const releases = new Map(result.rows.map((row) => [row.platform, mapRelease(row)]));
  return DOWNLOAD_PLATFORMS.map((platform) => mergePlatform(platform, releases.get(platform.key)));
}

export async function listAdminDownloadPlatforms() {
  const pool = getPostgresPool();
  const result = await pool.query("select * from public.client_releases");
  const releases = new Map(result.rows.map((row) => [row.platform, mapRelease(row)]));
  return DOWNLOAD_PLATFORMS.map((platform) => mergePlatform(platform, releases.get(platform.key)));
}

export async function getAdminDownloadPlatform(platformKey) {
  const platform = getPlatform(platformKey);
  if (!platform) return null;

  const pool = getPostgresPool();
  const result = await pool.query("select * from public.client_releases where platform = $1", [platformKey]);
  return mergePlatform(platform, mapRelease(result.rows[0]));
}

export async function getPublishedRelease(platformKey) {
  const platform = getPlatform(platformKey);
  if (!platform) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.client_releases
     where platform = $1 and is_published = true`,
    [platformKey]
  );
  const release = mapRelease(result.rows[0]);
  return release ? mergePlatform(platform, release) : null;
}

export async function clientReleaseFileExists(storagePath) {
  if (!storagePath) return false;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select 1
     from storage.objects
     where bucket_id = $1 and name = $2
     limit 1`,
    [DOWNLOAD_BUCKET, storagePath]
  );

  return Boolean(result.rows[0]);
}

export async function updateClientRelease(platformKey, adminUser, input) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.client_releases (
      platform,
      version,
      build_number,
      release_notes,
      external_url,
      is_published,
      published_at,
      created_by,
      updated_at
    )
    values ($1, $2, $3, $4, $5, $6, case when $6 then now() else null end, $7, now())
    on conflict (platform) do update
    set
      version = excluded.version,
      build_number = excluded.build_number,
      release_notes = excluded.release_notes,
      external_url = excluded.external_url,
      is_published = excluded.is_published,
      published_at = case
        when excluded.is_published and public.client_releases.published_at is null then now()
        when excluded.is_published then public.client_releases.published_at
        else null
      end,
      created_by = excluded.created_by,
      updated_at = now()
    returning *`,
    [
      platformKey,
      input.version,
      input.buildNumber,
      input.releaseNotes,
      input.externalUrl,
      input.isPublished,
      adminUser.id
    ]
  );

  return mapRelease(result.rows[0]);
}

export async function updateClientReleaseFile(platformKey, adminUser, fileInfo) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.client_releases (
      platform,
      storage_path,
      file_size,
      checksum_sha256,
      upload_status,
      original_filename,
      content_type,
      created_by,
      updated_at
    )
    values ($1, $2, $3, $4, 'uploaded', $5, $6, $7, now())
    on conflict (platform) do update
    set
      storage_path = excluded.storage_path,
      file_size = excluded.file_size,
      checksum_sha256 = excluded.checksum_sha256,
      upload_status = excluded.upload_status,
      original_filename = excluded.original_filename,
      content_type = excluded.content_type,
      is_published = false,
      published_at = null,
      created_by = excluded.created_by,
      updated_at = now()
    returning *`,
    [
      platformKey,
      fileInfo.storagePath,
      fileInfo.fileSize,
      fileInfo.checksumSha256,
      fileInfo.originalFilename,
      fileInfo.contentType || "application/octet-stream",
      adminUser.id
    ]
  );

  return mapRelease(result.rows[0]);
}

export async function markClientReleaseUploading(platformKey, adminUser, fileInfo) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.client_releases (
      platform,
      storage_path,
      file_size,
      upload_status,
      original_filename,
      content_type,
      created_by,
      updated_at
    )
    values ($1, $2, $3, 'uploading', $4, $5, $6, now())
    on conflict (platform) do update
    set
      storage_path = excluded.storage_path,
      file_size = excluded.file_size,
      upload_status = excluded.upload_status,
      original_filename = excluded.original_filename,
      content_type = excluded.content_type,
      is_published = false,
      published_at = null,
      created_by = excluded.created_by,
      updated_at = now()
    returning *`,
    [
      platformKey,
      fileInfo.storagePath,
      fileInfo.fileSize,
      fileInfo.originalFilename,
      fileInfo.contentType || "application/octet-stream",
      adminUser.id
    ]
  );

  return mapRelease(result.rows[0]);
}

export async function updateClientReleaseUploadStatus(platformKey, adminUser, uploadStatus) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.client_releases (
      platform,
      upload_status,
      created_by,
      updated_at
    )
    values ($1, $2, $3, now())
    on conflict (platform) do update
    set
      upload_status = excluded.upload_status,
      created_by = excluded.created_by,
      updated_at = now()
    returning *`,
    [platformKey, uploadStatus, adminUser.id]
  );

  return mapRelease(result.rows[0]);
}

export async function clearClientReleaseFile(platformKey, adminUser) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.client_releases (
      platform,
      upload_status,
      is_published,
      created_by,
      updated_at
    )
    values ($1, 'idle', false, $2, now())
    on conflict (platform) do update
     set
      storage_path = null,
      file_size = null,
      checksum_sha256 = null,
      upload_status = 'idle',
      original_filename = null,
      content_type = null,
      is_published = false,
      published_at = null,
      created_by = excluded.created_by,
      updated_at = now()
     returning *`,
    [platformKey, adminUser.id]
  );

  return mapRelease(result.rows[0]);
}

export async function buildFileUpload(file, platformKey) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "bin";
  const storagePath = `${platformKey}/${Date.now()}-${randomUUID()}.${safeExtension}`;

  return {
    buffer,
    storagePath,
    fileSize: buffer.length,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    originalFilename: file.name,
    contentType: file.type || "application/octet-stream"
  };
}

export function createStoragePath(platformKey, filename = "release.bin") {
  const extension = getReleaseFileExtension(filename) || "bin";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "bin";
  return `${platformKey}/${Date.now()}-${randomUUID()}.${safeExtension}`;
}
