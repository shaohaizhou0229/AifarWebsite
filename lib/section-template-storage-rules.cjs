const sectionTemplateRules = require("./section-template-rules.cjs");

const EDITABLE_TEMPLATE_SOURCES = new Set(["manual", "ai"]);

function cloneContent(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeTemplateSource(value) {
  const source = String(value || "manual").trim();
  if (source === "system") {
    const error = new Error("System section templates cannot be created.");
    error.code = "system_template_forbidden";
    throw error;
  }
  return EDITABLE_TEMPLATE_SOURCES.has(source) ? source : "manual";
}

function prepareSectionTemplateCreateInput(input = {}) {
  const source = normalizeTemplateSource(input.source);
  const normalized = sectionTemplateRules.normalizeSectionTemplateInput({
    name: input.name,
    description: input.description,
    industry: input.industry,
    purpose: input.purpose,
    tags: input.tags,
    source,
    status: source === "ai" ? "ready" : (input.status || "ready"),
    riskFlags: input.riskFlags || input.risk_flags,
    isFavorite: input.isFavorite === true || input.is_favorite === true,
    content: cloneContent(input.content || input.templateContent || input.template_content)
  });

  return {
    ...normalized,
    source,
    status: source === "ai" ? "ready" : normalized.status
  };
}

function prepareSectionTemplateMetadataUpdateInput(current = {}, input = {}) {
  const normalized = sectionTemplateRules.normalizeSectionTemplateInput({
    name: input.name === undefined ? current.name : input.name,
    description: input.description === undefined ? current.description : input.description,
    industry: input.industry === undefined ? current.industry : input.industry,
    purpose: input.purpose === undefined ? current.purpose : input.purpose,
    tags: input.tags === undefined ? current.tags : input.tags,
    source: current.source || "manual",
    status: input.status === undefined ? current.status : input.status,
    riskFlags: input.riskFlags === undefined && input.risk_flags === undefined
      ? current.riskFlags
      : (input.riskFlags || input.risk_flags),
    isFavorite: input.isFavorite === undefined && input.is_favorite === undefined
      ? current.isFavorite
      : (input.isFavorite === true || input.is_favorite === true),
    content: cloneContent(current.content)
  });

  return {
    ...normalized,
    source: current.source || "manual",
    content: cloneContent(current.content)
  };
}

module.exports = {
  prepareSectionTemplateCreateInput,
  prepareSectionTemplateMetadataUpdateInput
};
