const sectionTemplateRules = require("./section-template-rules.cjs");

const TEMPLATE_INDUSTRY_FILTERS = [
  "all",
  "public_service",
  "marketing",
  "tourism",
  "corporate",
  "custom"
];

const SECTION_TEMPLATE_PAGE_KEYS = new Set(["home", "product"]);
const EDITABLE_TEMPLATE_SOURCES = new Set(["manual", "ai"]);
const AI_PREVIEW_TEMPLATE_ID_PREFIX = "ai-section-template-preview-";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function buildSectionTemplatesUrl(options = {}) {
  const params = new URLSearchParams();
  const locale = String(options.locale || "").trim();
  const pageKey = String(options.pageKey || "").trim();

  if (locale) params.set("locale", locale);
  if (SECTION_TEMPLATE_PAGE_KEYS.has(pageKey)) params.set("page", pageKey);

  const query = params.toString();
  return query
    ? `/api/admin/site-content/section-templates/?${query}`
    : "/api/admin/site-content/section-templates/";
}

function templateSearchText(template) {
  return normalizeText([
    template?.name,
    template?.description,
    template?.industry,
    template?.purpose,
    template?.source,
    template?.pageKey,
    ...(Array.isArray(template?.tags) ? template.tags : [])
  ].filter(Boolean).join(" "));
}

function filterSectionTemplates(templates, filters = {}) {
  const source = Array.isArray(templates) ? templates : [];
  const industry = String(filters.industry || "all").trim();
  const query = normalizeText(filters.query);

  return source.filter((template) => {
    if (industry && industry !== "all" && template?.industry !== industry) return false;
    if (query && !templateSearchText(template).includes(query)) return false;
    return true;
  });
}

function parseTemplateTags(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,\n]/);

  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 16);
}

function formatTemplateTags(tags = []) {
  return parseTemplateTags(tags).join(", ");
}

function createTemplateMetadataDraft(template = {}) {
  const source = template || {};
  return {
    name: String(source.name || "").trim(),
    description: String(source.description || "").trim(),
    industry: String(source.industry || "custom").trim() || "custom",
    purpose: String(source.purpose || "general").trim() || "general",
    tagsText: formatTemplateTags(source.tags),
    pageKey: SECTION_TEMPLATE_PAGE_KEYS.has(String(source.pageKey || "").trim())
      ? String(source.pageKey || "").trim()
      : "",
    isFavorite: source.isFavorite === true
  };
}

function isEditableTemplate(template = {}) {
  if (!template || template.isSystem) return false;
  const id = String(template.id || "").trim();
  if (!id || id.startsWith("system-") || id.startsWith(AI_PREVIEW_TEMPLATE_ID_PREFIX)) return false;
  if (!UUID_PATTERN.test(id)) return false;
  return EDITABLE_TEMPLATE_SOURCES.has(String(template.source || "manual"));
}

function createTemplateMetadataPayload(draft = {}) {
  return {
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    industry: String(draft.industry || "custom").trim() || "custom",
    purpose: String(draft.purpose || "general").trim() || "general",
    tags: parseTemplateTags(draft.tagsText || draft.tags),
    pageKey: SECTION_TEMPLATE_PAGE_KEYS.has(String(draft.pageKey || "").trim())
      ? String(draft.pageKey || "").trim()
      : "",
    isFavorite: draft.isFavorite === true
  };
}

function createAiCandidateTemplateSavePayload(candidate = {}, draft = {}, options = {}) {
  if (!candidate || !candidate.content) {
    throw new Error("Invalid section template.");
  }

  const metadata = createTemplateMetadataPayload({
    ...createTemplateMetadataDraft(candidate),
    ...draft
  });
  const normalized = sectionTemplateRules.normalizeSectionTemplateInput({
    ...metadata,
    source: "ai",
    status: "ready",
    riskFlags: candidate.riskFlags,
    content: cloneValue(candidate.content)
  });

  return {
    locale: String(options.locale || candidate.locale || "").trim(),
    pageKey: metadata.pageKey,
    name: normalized.name,
    description: normalized.description,
    industry: normalized.industry,
    purpose: normalized.purpose,
    tags: normalized.tags,
    source: "ai",
    status: "ready",
    riskFlags: normalized.riskFlags,
    isFavorite: metadata.isFavorite,
    content: cloneValue(normalized.content)
  };
}

function createTemplateInsertIdSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInsertableSectionFromUiTemplate(template, options = {}) {
  if (!template || !template.content) {
    throw new Error("Invalid section template.");
  }

  return sectionTemplateRules.createInsertableSectionFromTemplate(template.content, {
    idSuffix: options.idSuffix || createTemplateInsertIdSuffix()
  });
}

function insertTemplateSection(sections, template, options = {}) {
  const currentSections = Array.isArray(sections) ? sections : [];
  const insertedSection = createInsertableSectionFromUiTemplate(template, options);
  const nextSections = [...currentSections];
  const insertionIndex = nextSections.findIndex((section) => section.id === options.afterSectionId);

  if (insertionIndex >= 0) {
    nextSections.splice(insertionIndex + 1, 0, insertedSection);
  } else {
    nextSections.push(insertedSection);
  }

  return { sections: nextSections, insertedSection };
}

function createTemplatePreviewPage(template) {
  if (!template || !template.content) {
    return { layoutVersion: sectionTemplateRules.SITE_LAYOUT_VERSION, sections: [] };
  }

  return sectionTemplateRules.normalizeSectionTemplateContent(template.content);
}

module.exports = {
  TEMPLATE_INDUSTRY_FILTERS,
  buildSectionTemplatesUrl,
  createAiCandidateTemplateSavePayload,
  createInsertableSectionFromUiTemplate,
  createTemplateMetadataDraft,
  createTemplateMetadataPayload,
  createTemplatePreviewPage,
  filterSectionTemplates,
  formatTemplateTags,
  insertTemplateSection,
  isEditableTemplate
};
