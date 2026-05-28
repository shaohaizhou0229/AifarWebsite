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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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
  createInsertableSectionFromUiTemplate,
  createTemplatePreviewPage,
  filterSectionTemplates,
  insertTemplateSection
};
