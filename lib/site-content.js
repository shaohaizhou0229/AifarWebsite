import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/db";
import { locales } from "@/i18n/routing";
import {
  collectSiteImagePaths,
  createSitePageTemplate,
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

function mapSiteContentSnapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    pageKey: row.page_key,
    locale: row.locale,
    snapshotType: row.snapshot_type,
    content: row.content || {},
    summary: row.summary || "",
    createdBy: row.created_by,
    archivedBy: row.archived_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    actorName: row.actor_name || "",
    actorEmail: row.actor_email || ""
  };
}

function mapSitePageTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    pageKey: row.page_key,
    locale: row.locale,
    name: row.name || "",
    description: row.description || "",
    content: row.template_content || {},
    includeSeo: Boolean(row.include_seo),
    isSystem: Boolean(row.is_system),
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function createSiteContentSnapshot({ pageKey, locale, content, snapshotType, adminUser, summary = "" }) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale || !content) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.site_page_content_snapshots (
      page_key,
      locale,
      snapshot_type,
      content,
      summary,
      created_by
    )
    values ($1, $2, $3, $4::jsonb, $5, $6)
    returning *`,
    [
      safePageKey,
      safeLocale,
      snapshotType,
      JSON.stringify(content),
      summary,
      adminUser?.id || null
    ]
  );

  return mapSiteContentSnapshot(result.rows[0]);
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

export async function listSiteContentSnapshots(pageKey, locale, limit = 20) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) return [];

  const safeLimit = Math.min(Math.max(Number(limit || 20), 1), 50);
  const pool = getPostgresPool();
  const result = await pool.query(
    `select snapshots.*, profiles.display_name as actor_name, profiles.email as actor_email
     from public.site_page_content_snapshots snapshots
     left join public.profiles profiles on profiles.id = snapshots.created_by
     where snapshots.page_key = $1 and snapshots.locale = $2 and snapshots.archived_at is null
     order by snapshots.created_at desc
     limit $3`,
    [safePageKey, safeLocale, safeLimit]
  );

  return result.rows.map(mapSiteContentSnapshot);
}

export async function listSiteContentSnapshotsForPages(pageKeys = [], locale, limit = 12) {
  const safePageKeys = pageKeys.map(sanitizeSitePageKey).filter(Boolean);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKeys.length || !safeLocale) return [];

  const safeLimit = Math.min(Math.max(Number(limit || 12), 1), 50);
  const pool = getPostgresPool();
  const result = await pool.query(
    `select snapshots.*, profiles.display_name as actor_name, profiles.email as actor_email
     from public.site_page_content_snapshots snapshots
     left join public.profiles profiles on profiles.id = snapshots.created_by
     where snapshots.page_key = any($1::text[]) and snapshots.locale = $2 and snapshots.archived_at is null
     order by snapshots.created_at desc
     limit $3`,
    [safePageKeys, safeLocale, safeLimit]
  );

  return result.rows.map(mapSiteContentSnapshot);
}

export async function archiveSiteContentSnapshot(snapshotId, adminUser) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_page_content_snapshots
     set archived_at = now(),
         archived_by = $2
     where id = $1 and archived_at is null
     returning *`,
    [snapshotId, adminUser.id]
  );

  return mapSiteContentSnapshot(result.rows[0]);
}

export async function listSitePageTemplates(pageKey, locale) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) return [];

  const systemTemplateKeys = [safePageKey === "home" ? "home-current" : "product-current", "conversion"];
  const systemTemplates = systemTemplateKeys.map((key) => ({
    id: `system-${key}`,
    key,
    pageKey: safePageKey,
    locale: safeLocale,
    name: key,
    description: "",
    content: null,
    includeSeo: false,
    isSystem: true,
    archivedAt: null,
    createdAt: null,
    updatedAt: null
  }));
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.site_page_templates
     where page_key = $1 and locale = $2 and archived_at is null
     order by updated_at desc`,
    [safePageKey, safeLocale]
  );

  return [...systemTemplates, ...result.rows.map(mapSitePageTemplate)];
}

export async function createSitePageTemplateRecord(pageKey, locale, adminUser, input = {}) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) {
    throw new Error("Unknown page or locale.");
  }

  const content = input.content && typeof input.content === "object" && !Array.isArray(input.content) ? input.content : {};
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.site_page_templates (
      page_key,
      locale,
      name,
      description,
      template_content,
      include_seo,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $4, $5::jsonb, $6, $7, $7)
    returning *`,
    [
      safePageKey,
      safeLocale,
      String(input.name || "").trim() || "Untitled template",
      String(input.description || "").trim(),
      JSON.stringify(content),
      Boolean(input.includeSeo),
      adminUser.id
    ]
  );
  await createSitePageTemplateVersion(result.rows[0].id, adminUser, "created", content);
  return mapSitePageTemplate(result.rows[0]);
}

export async function updateSitePageTemplateRecord(templateId, adminUser, input = {}) {
  const content = input.content && typeof input.content === "object" && !Array.isArray(input.content) ? input.content : {};
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_page_templates
     set name = $2,
         description = $3,
         template_content = $4::jsonb,
         include_seo = $5,
         updated_by = $6,
         updated_at = now()
     where id = $1 and is_system = false and archived_at is null
     returning *`,
    [
      templateId,
      String(input.name || "").trim() || "Untitled template",
      String(input.description || "").trim(),
      JSON.stringify(content),
      Boolean(input.includeSeo),
      adminUser.id
    ]
  );
  if (!result.rows[0]) return null;
  await createSitePageTemplateVersion(templateId, adminUser, "updated", content);
  return mapSitePageTemplate(result.rows[0]);
}

export async function archiveSitePageTemplateRecord(templateId, adminUser) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_page_templates
     set archived_at = now(),
         updated_by = $2,
         updated_at = now()
     where id = $1 and is_system = false and archived_at is null
     returning *`,
    [templateId, adminUser.id]
  );
  if (!result.rows[0]) return null;
  await createSitePageTemplateVersion(templateId, adminUser, "archived", result.rows[0].template_content || {});
  return mapSitePageTemplate(result.rows[0]);
}

async function createSitePageTemplateVersion(templateId, adminUser, versionType, content) {
  const pool = getPostgresPool();
  await pool.query(
    `insert into public.site_page_template_versions (
      template_id,
      version_type,
      template_content,
      created_by
    )
    values ($1, $2, $3::jsonb, $4)`,
    [templateId, versionType, JSON.stringify(content || {}), adminUser?.id || null]
  );
}

export async function saveSitePageDraft(pageKey, locale, adminUser, content, snapshotOptions = {}) {
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

  const snapshotType = snapshotOptions.snapshotType === false
    ? ""
    : snapshotOptions.snapshotType || "draft_saved";
  if (snapshotType) {
    await createSiteContentSnapshot({
      pageKey: safePageKey,
      locale: safeLocale,
      content: nextContent,
      snapshotType,
      adminUser,
      summary: snapshotOptions.summary || "Draft saved"
    });
  }

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

  await createSiteContentSnapshot({
    pageKey: safePageKey,
    locale: safeLocale,
    content: entry?.draftContent || {},
    snapshotType: "published",
    adminUser,
    summary: "Draft published"
  });
  return mapSiteContentRow(result.rows[0]);
}

export async function restoreSiteContentSnapshot(snapshotId, adminUser) {
  const pool = getPostgresPool();
  const snapshotResult = await pool.query(
    `select *
     from public.site_page_content_snapshots
     where id = $1 and archived_at is null
     limit 1`,
    [snapshotId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;

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
    set draft_content = excluded.draft_content,
        updated_by = excluded.updated_by,
        updated_at = now()
    returning *`,
    [
      snapshot.page_key,
      snapshot.locale,
      JSON.stringify(snapshot.content || {}),
      adminUser.id
    ]
  );
  await createSiteContentSnapshot({
    pageKey: snapshot.page_key,
    locale: snapshot.locale,
    content: snapshot.content || {},
    snapshotType: "restored",
    adminUser,
    summary: `Restored snapshot ${snapshot.id}`
  });

  return mapSiteContentRow(result.rows[0]);
}

export async function applySitePageTemplateToDraft(templateId, pageKey, locale, adminUser, fallback, options = {}) {
  const safePageKey = sanitizeSitePageKey(pageKey);
  const safeLocale = sanitizeSiteLocale(locale);
  if (!safePageKey || !safeLocale) {
    throw new Error("Unknown page or locale.");
  }

  const current = await getAdminSitePageContent(safePageKey, safeLocale, fallback);
  const includeSeoOverride = typeof options.includeSeo === "boolean" ? options.includeSeo : null;
  let content = null;
  if (templateId.startsWith("system-")) {
    const templateKey = templateId.replace(/^system-/, "");
    content = createSitePageTemplate(templateKey, safePageKey, current.content);
    if (includeSeoOverride === false) {
      content = {
        ...content,
        seo: current.content?.seo
      };
    }
  } else {
    const pool = getPostgresPool();
    const result = await pool.query(
      `select *
       from public.site_page_templates
       where id = $1 and page_key = $2 and locale = $3 and archived_at is null
       limit 1`,
      [templateId, safePageKey, safeLocale]
    );
    const template = result.rows[0];
    if (!template) return null;
    const shouldIncludeSeo = includeSeoOverride === null ? template.include_seo : includeSeoOverride;
    content = {
      ...template.template_content,
      seo: shouldIncludeSeo ? template.template_content?.seo : current.content?.seo
    };
  }

  const entry = await saveSitePageDraft(safePageKey, safeLocale, adminUser, content, {
    snapshotType: "template_applied",
    summary: `Template applied: ${templateId}`
  });
  return entry;
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
