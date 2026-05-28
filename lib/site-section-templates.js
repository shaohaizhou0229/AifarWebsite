import { getPostgresPool } from "@/lib/db";
import { locales } from "@/i18n/routing";
import sectionTemplateRules from "@/lib/section-template-rules.cjs";
import systemSectionTemplates from "@/lib/system-section-templates.cjs";

const SITE_SECTION_TEMPLATE_PAGE_KEYS = new Set(["home", "product"]);

export function sanitizeSectionTemplatePageKey(value) {
  const pageKey = String(value || "").trim();
  return SITE_SECTION_TEMPLATE_PAGE_KEYS.has(pageKey) ? pageKey : "";
}

export function sanitizeSectionTemplateLocale(value) {
  const locale = String(value || "").trim();
  return locales.includes(locale) ? locale : "";
}

function normalizeOptionalPageKey(value) {
  if (!value) return null;
  const pageKey = sanitizeSectionTemplatePageKey(value);
  if (!pageKey) {
    throw new Error("Unknown page.");
  }
  return pageKey;
}

function normalizeLocale(value) {
  const locale = sanitizeSectionTemplateLocale(value || "en");
  if (!locale) {
    throw new Error("Unknown locale.");
  }
  return locale;
}

function mapSectionTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    pageKey: row.page_key || "",
    locale: row.locale,
    name: row.name || "",
    description: row.description || "",
    industry: row.industry || "custom",
    purpose: row.purpose || "general",
    tags: Array.isArray(row.tags) ? row.tags : [],
    source: row.source || "manual",
    status: row.status || "ready",
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
    content: row.template_content || {},
    isFavorite: Boolean(row.is_favorite),
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    usageCount: Number(row.usage_count || 0),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    isSystem: false
  };
}

function normalizeFilterList(value, allowedValues) {
  const item = String(value || "").trim();
  return allowedValues.includes(item) ? item : "";
}

function isMissingSectionTemplateTableError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.code === "42P01" || message.includes("site_section_templates");
}

async function listDatabaseSectionTemplates(filters = {}) {
  const locale = normalizeLocale(filters.locale);
  const pageKey = filters.pageKey ? normalizeOptionalPageKey(filters.pageKey) : null;
  const source = normalizeFilterList(filters.source, sectionTemplateRules.SECTION_TEMPLATE_SOURCES);
  const industry = normalizeFilterList(filters.industry, sectionTemplateRules.SECTION_TEMPLATE_INDUSTRIES);
  const includeArchived = filters.includeArchived === true;
  const conditions = ["locale = $1"];
  const params = [locale];

  if (pageKey) {
    params.push(pageKey);
    conditions.push(`(page_key is null or page_key = $${params.length})`);
  }

  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  if (industry) {
    params.push(industry);
    conditions.push(`industry = $${params.length}`);
  }

  if (!includeArchived) {
    conditions.push("archived_at is null");
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.site_section_templates
     where ${conditions.join(" and ")}
     order by is_favorite desc, usage_count desc, updated_at desc`,
    params
  );

  return result.rows.map(mapSectionTemplateRow);
}

export async function listSiteSectionTemplates(filters = {}) {
  const source = normalizeFilterList(filters.source, sectionTemplateRules.SECTION_TEMPLATE_SOURCES);

  if (source === "system") {
    return systemSectionTemplates.mergeSectionTemplateLists([], filters);
  }

  try {
    const databaseTemplates = await listDatabaseSectionTemplates(filters);
    return systemSectionTemplates.mergeSectionTemplateLists(databaseTemplates, filters);
  } catch (error) {
    if (isMissingSectionTemplateTableError(error)) {
      return systemSectionTemplates.mergeSectionTemplateLists([], filters);
    }
    throw error;
  }
}

export async function createSiteSectionTemplateRecord(adminUser, input = {}) {
  const locale = normalizeLocale(input.locale);
  const pageKey = normalizeOptionalPageKey(input.pageKey || input.page_key || "");
  const template = sectionTemplateRules.normalizeSectionTemplateInput(input);
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.site_section_templates (
      page_key,
      locale,
      name,
      description,
      industry,
      purpose,
      tags,
      source,
      status,
      risk_flags,
      template_content,
      is_favorite,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10::text[], $11::jsonb, $12, $13, $13)
    returning *`,
    [
      pageKey,
      locale,
      template.name,
      template.description,
      template.industry,
      template.purpose,
      template.tags,
      template.source,
      template.status,
      template.riskFlags,
      JSON.stringify(template.content),
      template.isFavorite,
      adminUser?.id || null
    ]
  );

  return mapSectionTemplateRow(result.rows[0]);
}

async function getEditableSectionTemplate(templateId) {
  if (systemSectionTemplates.isSystemSectionTemplateId(templateId)) {
    throw new Error("System section templates cannot be edited or archived.");
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.site_section_templates
     where id = $1 and archived_at is null
     limit 1`,
    [templateId]
  );
  const template = mapSectionTemplateRow(result.rows[0]);
  if (!template) return null;
  if (template.source === "system") {
    throw new Error("System section templates cannot be edited or archived.");
  }
  return template;
}

export async function updateSiteSectionTemplateRecord(templateId, adminUser, input = {}) {
  const current = await getEditableSectionTemplate(templateId);
  if (!current) return null;

  const locale = input.locale === undefined ? current.locale : normalizeLocale(input.locale);
  const pageKey = input.pageKey === undefined && input.page_key === undefined
    ? (current.pageKey || null)
    : normalizeOptionalPageKey(input.pageKey || input.page_key || "");
  const merged = {
    name: input.name === undefined ? current.name : input.name,
    description: input.description === undefined ? current.description : input.description,
    industry: input.industry === undefined ? current.industry : input.industry,
    purpose: input.purpose === undefined ? current.purpose : input.purpose,
    tags: input.tags === undefined ? current.tags : input.tags,
    source: current.source,
    status: input.status === undefined ? current.status : input.status,
    riskFlags: input.riskFlags === undefined && input.risk_flags === undefined ? current.riskFlags : (input.riskFlags || input.risk_flags),
    isFavorite: input.isFavorite === undefined && input.is_favorite === undefined ? current.isFavorite : (input.isFavorite === true || input.is_favorite === true),
    content: input.content || input.templateContent || input.template_content || current.content
  };
  const template = sectionTemplateRules.normalizeSectionTemplateInput(merged);
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_section_templates
     set page_key = $2,
         locale = $3,
         name = $4,
         description = $5,
         industry = $6,
         purpose = $7,
         tags = $8::text[],
         status = $9,
         risk_flags = $10::text[],
         template_content = $11::jsonb,
         is_favorite = $12,
         updated_by = $13,
         updated_at = now()
     where id = $1 and archived_at is null
     returning *`,
    [
      templateId,
      pageKey,
      locale,
      template.name,
      template.description,
      template.industry,
      template.purpose,
      template.tags,
      template.status,
      template.riskFlags,
      JSON.stringify(template.content),
      template.isFavorite,
      adminUser?.id || null
    ]
  );

  return mapSectionTemplateRow(result.rows[0]);
}

export async function archiveSiteSectionTemplateRecord(templateId, adminUser) {
  const current = await getEditableSectionTemplate(templateId);
  if (!current) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.site_section_templates
     set archived_at = now(),
         updated_by = $2,
         updated_at = now()
     where id = $1 and archived_at is null
     returning *`,
    [templateId, adminUser?.id || null]
  );

  return mapSectionTemplateRow(result.rows[0]);
}

export function createInsertableSectionFromTemplate(content, options = {}) {
  return sectionTemplateRules.createInsertableSectionFromTemplate(content, options);
}
