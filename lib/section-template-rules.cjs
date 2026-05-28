const SITE_LAYOUT_VERSION = 2;

const SITE_SECTION_TYPES = [
  "hero",
  "trust_bar",
  "card_grid",
  "feature_list",
  "capability_matrix",
  "media_feature",
  "scenario_split",
  "workflow_steps",
  "module_showcase",
  "security_assurance",
  "download_panel",
  "faq_band",
  "support_entry",
  "updates_list",
  "cta_band"
];

const SECTION_VARIANTS = {
  hero: ["split", "simple"],
  trust_bar: ["four"],
  card_grid: ["four", "three"],
  feature_list: ["list"],
  capability_matrix: ["three", "four"],
  media_feature: ["image-right", "image-only"],
  scenario_split: ["two"],
  workflow_steps: ["numbered"],
  module_showcase: ["six"],
  security_assurance: ["checklist"],
  download_panel: ["split"],
  faq_band: ["accordion"],
  support_entry: ["four", "three"],
  updates_list: ["list"],
  cta_band: ["dark"]
};

const SECTION_TEMPLATE_SOURCES = ["system", "manual", "ai"];
const SECTION_TEMPLATE_STATUSES = ["ready", "pending_review"];
const SECTION_TEMPLATE_INDUSTRIES = ["public_service", "marketing", "tourism", "corporate", "custom"];
const SECTION_TEMPLATE_RISK_FLAGS = [
  "low_confidence",
  "copyright_review",
  "brand_asset_detected",
  "external_links_removed",
  "unsupported_motion",
  "manual_review_required"
];

const STYLE_TOKENS = {
  textSize: ["small", "medium", "large"],
  titleWeight: ["500", "600", "700", "800"],
  cardStyle: ["flat", "outlined", "shadow"],
  iconStyle: ["line", "filled"],
  buttonStyle: ["solid", "outline"],
  colorScheme: ["default", "brand", "blue", "green", "neutral"],
  imageRadius: ["none", "small", "medium", "large"],
  cardSpacing: ["compact", "normal", "relaxed"]
};

const LAYOUT_TOKENS = {
  desktopArrangement: ["split", "stacked", "overlay", "background"],
  mobileArrangement: ["single-column", "image-top", "image-bottom"],
  cardColumns: [1, 2, 3, 4],
  contentAlign: ["left", "center"],
  imagePosition: ["left", "right", "top", "background"],
  entranceAnimation: ["none", "fade", "fade-up", "stagger"],
  hoverIn: ["none", "lift", "reveal"],
  hoverOut: ["none", "reset", "fade"]
};

const FORBIDDEN_KEYS = new Set([
  "class",
  "className",
  "css",
  "customCss",
  "customHtml",
  "customJs",
  "dangerouslySetInnerHTML",
  "html",
  "innerHTML",
  "javascript",
  "outerHTML",
  "rawHtml",
  "script",
  "styleTag"
]);

const UNSAFE_STRING_PATTERNS = [
  /<\/?[a-z][\s\S]*>/i,
  /\bjavascript\s*:/i,
  /\bvbscript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
  /\bon[a-z]+\s*=/i,
  /\bstyle\s*=/i,
  /\bexpression\s*\(/i
];

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function templateError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertAllowedKey(key, path) {
  const safeKey = clean(key);
  if (!safeKey || FORBIDDEN_KEYS.has(safeKey) || /^on[A-Z]/.test(safeKey)) {
    throw templateError("unsafe_template_key", `Unsafe template key at ${path}.`);
  }
}

function assertSafeString(value, path) {
  for (const pattern of UNSAFE_STRING_PATTERNS) {
    if (pattern.test(value)) {
      throw templateError("unsafe_template_value", `Unsafe template value at ${path}.`);
    }
  }
}

function normalizePrimitive(value, path) {
  if (typeof value === "string") {
    assertSafeString(value, path);
    return value.slice(0, 4000);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw templateError("invalid_template_value", `Invalid number at ${path}.`);
    }
    return value;
  }
  if (typeof value === "boolean" || value === null) return value;
  throw templateError("invalid_template_value", `Unsupported value at ${path}.`);
}

function normalizeJsonValue(value, path = "content", depth = 0) {
  if (depth > 8) {
    throw templateError("template_too_deep", `Template content is too deep at ${path}.`);
  }
  if (Array.isArray(value)) {
    if (value.length > 100) {
      throw templateError("template_array_too_large", `Template array is too large at ${path}.`);
    }
    return value.map((item, index) => normalizeJsonValue(item, `${path}[${index}]`, depth + 1));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        assertAllowedKey(key, `${path}.${key}`);
        return [key, normalizeJsonValue(child, `${path}.${key}`, depth + 1)];
      })
    );
  }
  return normalizePrimitive(value, path);
}

function normalizeTokenGroup(value, allowedTokens, path) {
  if (!value) return {};
  if (!isObject(value)) {
    throw templateError("invalid_template_token_group", `${path} must be an object.`);
  }

  const normalized = {};
  for (const [key, child] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(allowedTokens, key)) {
      throw templateError("invalid_template_token", `Unsupported token ${path}.${key}.`);
    }
    const allowed = allowedTokens[key];
    const nextValue = typeof child === "number" ? child : clean(child);
    if (!allowed.includes(nextValue)) {
      throw templateError("invalid_template_token", `Invalid token value at ${path}.${key}.`);
    }
    normalized[key] = nextValue;
  }
  return normalized;
}

function normalizeImageSpecs(value) {
  if (!value) return {};
  if (!isObject(value)) {
    throw templateError("invalid_image_specs", "Image specs must be an object.");
  }

  const normalized = {};
  for (const [pathKey, spec] of Object.entries(value)) {
    if (!["heroImagePath", "imagePath"].includes(pathKey)) {
      throw templateError("invalid_image_specs", `Unsupported image spec key ${pathKey}.`);
    }
    if (!isObject(spec)) {
      throw templateError("invalid_image_specs", `Image spec ${pathKey} must be an object.`);
    }
    const nextSpec = {};
    for (const dimensionKey of ["width", "height"]) {
      if (spec[dimensionKey] === undefined || spec[dimensionKey] === "") continue;
      const dimension = Number(spec[dimensionKey]);
      if (!Number.isInteger(dimension) || dimension < 128 || dimension > 4096) {
        throw templateError("invalid_image_specs", `Invalid image ${dimensionKey} for ${pathKey}.`);
      }
      nextSpec[dimensionKey] = dimension;
    }
    const source = clean(spec.source);
    if (source) {
      if (!["aiDefault", "sectionImageSpec"].includes(source)) {
        throw templateError("invalid_image_specs", `Invalid image spec source for ${pathKey}.`);
      }
      nextSpec.source = source;
    }
    normalized[pathKey] = nextSpec;
  }
  return normalized;
}

function normalizeSectionSettings(value = {}) {
  if (!value) return {};
  if (!isObject(value)) {
    throw templateError("invalid_section_settings", "Section settings must be an object.");
  }

  const normalized = {};
  for (const key of Object.keys(value)) {
    if (!["tone", "anchorId", "imageSpecs", "style", "layout"].includes(key)) {
      throw templateError("invalid_section_settings", `Unsupported section setting ${key}.`);
    }
  }

  if (value.tone !== undefined) {
    const tone = clean(value.tone) || "plain";
    if (!["plain", "alt"].includes(tone)) {
      throw templateError("invalid_section_settings", "Invalid section tone.");
    }
    if (tone !== "plain") normalized.tone = tone;
  }

  if (value.anchorId !== undefined) {
    const anchorId = clean(value.anchorId).slice(0, 80);
    if (anchorId) {
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(anchorId)) {
        throw templateError("invalid_section_settings", "Invalid anchor ID.");
      }
      normalized.anchorId = anchorId;
    }
  }

  const imageSpecs = normalizeImageSpecs(value.imageSpecs);
  if (Object.keys(imageSpecs).length) normalized.imageSpecs = imageSpecs;

  const style = normalizeTokenGroup(value.style, STYLE_TOKENS, "settings.style");
  if (Object.keys(style).length) normalized.style = style;

  const layout = normalizeTokenGroup(value.layout, LAYOUT_TOKENS, "settings.layout");
  if (Object.keys(layout).length) normalized.layout = layout;

  return normalized;
}

function normalizeSectionId(type, value) {
  const id = clean(value);
  if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id.slice(0, 120);
  return `${type}-template`;
}

function normalizeTemplateSection(section) {
  if (!isObject(section)) {
    throw templateError("invalid_template_section", "Template section must be an object.");
  }

  const type = clean(section.type);
  if (!SITE_SECTION_TYPES.includes(type)) {
    throw templateError("invalid_section_type", "Unsupported section type.");
  }

  const variants = SECTION_VARIANTS[type] || [];
  const variant = clean(section.variant) || variants[0] || "";
  if (!variants.includes(variant)) {
    throw templateError("invalid_section_variant", "Unsupported section variant.");
  }

  return {
    id: normalizeSectionId(type, section.id),
    type,
    variant,
    settings: normalizeSectionSettings(section.settings || {}),
    content: normalizeJsonValue(isObject(section.content) ? section.content : {}, "section.content")
  };
}

function normalizeSectionTemplateContent(value) {
  const source = isObject(value) ? value : {};
  const rawSections = Array.isArray(source.sections)
    ? source.sections
    : (source.type ? [source] : []);

  if (rawSections.length !== 1) {
    throw templateError("invalid_template_content", "A section template must contain exactly one section.");
  }

  return {
    layoutVersion: SITE_LAYOUT_VERSION,
    sections: [normalizeTemplateSection(rawSections[0])]
  };
}

function normalizeList(value, options = {}) {
  const source = Array.isArray(value) ? value : [];
  const limit = options.limit || 12;
  return [...new Set(source.map((item) => clean(item)).filter(Boolean))]
    .slice(0, limit)
    .map((item) => item.slice(0, options.maxLength || 40));
}

function normalizeSectionTemplateInput(input = {}) {
  if (!isObject(input)) {
    throw templateError("invalid_template_input", "Template input must be an object.");
  }

  const name = clean(input.name).slice(0, 120);
  if (!name) {
    throw templateError("template_name_required", "Template name is required.");
  }

  const source = clean(input.source) || "manual";
  if (!SECTION_TEMPLATE_SOURCES.includes(source)) {
    throw templateError("invalid_template_source", "Invalid template source.");
  }

  const status = clean(input.status) || "ready";
  if (!SECTION_TEMPLATE_STATUSES.includes(status)) {
    throw templateError("invalid_template_status", "Invalid template status.");
  }

  const industry = clean(input.industry) || "custom";
  if (!SECTION_TEMPLATE_INDUSTRIES.includes(industry)) {
    throw templateError("invalid_template_industry", "Invalid template industry.");
  }

  const content = input.content || input.templateContent || input.template_content;
  const riskFlags = normalizeList(input.riskFlags || input.risk_flags, { limit: 12, maxLength: 40 });
  for (const flag of riskFlags) {
    if (!SECTION_TEMPLATE_RISK_FLAGS.includes(flag)) {
      throw templateError("invalid_template_risk_flag", "Invalid template risk flag.");
    }
  }

  return {
    name,
    description: clean(input.description).slice(0, 500),
    industry,
    purpose: (clean(input.purpose) || "general").slice(0, 80),
    tags: normalizeList(input.tags, { limit: 16, maxLength: 40 }),
    source,
    status,
    riskFlags,
    isFavorite: input.isFavorite === true || input.is_favorite === true,
    content: normalizeSectionTemplateContent(content)
  };
}

function createInsertableSectionFromTemplate(content, options = {}) {
  const normalized = normalizeSectionTemplateContent(content);
  const section = JSON.parse(JSON.stringify(normalized.sections[0]));
  const suffix = options.idSuffix || Date.now();
  section.id = `${section.type}-${suffix}`;
  return section;
}

module.exports = {
  LAYOUT_TOKENS,
  SECTION_TEMPLATE_INDUSTRIES,
  SECTION_TEMPLATE_RISK_FLAGS,
  SECTION_TEMPLATE_SOURCES,
  SECTION_TEMPLATE_STATUSES,
  SECTION_VARIANTS,
  SITE_LAYOUT_VERSION,
  SITE_SECTION_TYPES,
  STYLE_TOKENS,
  createInsertableSectionFromTemplate,
  normalizeSectionTemplateContent,
  normalizeSectionTemplateInput,
  normalizeSectionSettings,
  normalizeTemplateSection
};
