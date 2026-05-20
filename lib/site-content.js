import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/db";
import { locales } from "@/i18n/routing";
import {
  collectSiteImagePaths,
  normalizeSitePageContent
} from "@/lib/site-page-builder";

export const SITE_CONTENT_BUCKET = "site-content-images";
export const MAX_SITE_IMAGE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_SITE_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
export const ALLOWED_SITE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const SITE_PAGE_KEYS = new Set(["home", "product"]);

export function sanitizeSitePageKey(value) {
  return SITE_PAGE_KEYS.has(value) ? value : "";
}

export function sanitizeSiteLocale(value) {
  return locales.includes(value) ? value : "";
}

export function getSiteImageExtension(filename = "") {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

export function isAllowedSiteImage(file) {
  const extension = getSiteImageExtension(file?.name || "");
  return (
    file instanceof File &&
    file.size <= MAX_SITE_IMAGE_SIZE &&
    ALLOWED_SITE_IMAGE_EXTENSIONS.has(extension) &&
    ALLOWED_SITE_IMAGE_TYPES.has(file.type)
  );
}

export function createSiteImagePath(pageKey, locale, filename = "image.webp") {
  const extension = getSiteImageExtension(filename) || "webp";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "webp";
  return `${pageKey}/${locale}/${Date.now()}-${randomUUID()}.${safeExtension}`;
}

export async function buildSiteImageUpload(file, pageKey, locale) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    buffer,
    storagePath: createSiteImagePath(pageKey, locale, file.name),
    fileSize: buffer.length,
    originalFilename: file.name,
    contentType: file.type || "application/octet-stream"
  };
}

function encodeStoragePath(storagePath = "") {
  return storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getSiteImageUrl(storagePath = "") {
  return storagePath ? `/api/site-content/images/${encodeStoragePath(storagePath)}` : "";
}

export function mergeSiteContent(pageKey, fallback, override) {
  return normalizeSitePageContent(pageKey, fallback, override, getSiteImageUrl);
}

function mapSiteContentRow(row) {
  if (!row) return null;
  return {
    pageKey: row.page_key,
    locale: row.locale,
    draftContent: row.draft_content || {},
    publishedContent: row.published_content || null,
    heroImagePath: row.hero_image_path || "",
    heroImageAlt: row.hero_image_alt || "",
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    updatedBy: row.updated_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function getSiteContentEntry(pageKey, locale) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.site_page_contents
     where page_key = $1 and locale = $2
     limit 1`,
    [safePageKey, safeLocale]
  );

  return mapSiteContentRow(result.rows[0]);
}

export async function getPublishedSitePageContent(pageKey, locale, fallback) {
  try {
    const entry = await getSiteContentEntry(pageKey, locale);
    if (!entry?.isPublished || !entry.publishedContent) {
      return mergeSiteContent(pageKey, fallback, null);
    }
    return mergeSiteContent(pageKey, fallback, entry.publishedContent);
  } catch {
    return mergeSiteContent(pageKey, fallback, null);
  }
}

export async function getAdminSitePageContent(pageKey, locale, fallback) {
  const entry = await getSiteContentEntry(pageKey, locale);
  const draft = entry?.draftContent && Object.keys(entry.draftContent).length ? entry.draftContent : null;
  const published = entry?.publishedContent || null;
  return {
    entry,
    content: mergeSiteContent(pageKey, fallback, draft || published),
    publishedContent: published ? mergeSiteContent(pageKey, fallback, published) : null,
    fallbackContent: mergeSiteContent(pageKey, fallback, null)
  };
}

export async function saveSitePageDraft(pageKey, locale, adminUser, content) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) {
    throw new Error("Unknown page or locale.");
  }

  const nextContent = content && typeof content === "object" && !Array.isArray(content) ? content : {};
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.site_page_contents (
      page_key,
      locale,
      draft_content,
      updated_by,
      updated_at
    )
    values ($1, $2, $3::jsonb, $4, now())
    on conflict (page_key, locale) do update
    set
      draft_content = excluded.draft_content,
      updated_by = excluded.updated_by,
      updated_at = now()
    returning *`,
    [safePageKey, safeLocale, JSON.stringify(nextContent), adminUser.id]
  );

  return mapSiteContentRow(result.rows[0]);
}

export async function publishSitePageDraft(pageKey, locale, adminUser) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) {
    throw new Error("Unknown page or locale.");
  }

  const entry = await getSiteContentEntry(safePageKey, safeLocale);
  const imagePaths = collectSiteImagePaths(entry?.draftContent || {});
  const primaryImagePath = imagePaths[0] || null;
  const heroAlt = entry?.draftContent?.sections?.find((section) => section?.type === "hero")?.content?.heroAlt || null;
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_page_contents
     set
      published_content = draft_content,
      hero_image_path = $3,
      hero_image_alt = $4,
      is_published = true,
      published_at = now(),
      updated_by = $5,
      updated_at = now()
     where page_key = $1 and locale = $2
     returning *`,
    [safePageKey, safeLocale, primaryImagePath, heroAlt, adminUser.id]
  );

  if (!result.rows[0]) {
    throw new Error("Save a draft before publishing.");
  }

  return mapSiteContentRow(result.rows[0]);
}

export async function isPublishedSiteImage(storagePath) {
  if (!storagePath) return false;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select 1
     from public.site_page_contents
     where is_published = true
      and (
        hero_image_path = $1
        or published_content::text like '%' || to_jsonb($1::text)::text || '%'
      )
     limit 1`,
    [storagePath]
  );

  return Boolean(result.rows[0]);
}
