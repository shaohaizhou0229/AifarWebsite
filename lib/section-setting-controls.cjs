const sectionTemplateRules = require("./section-template-rules.cjs");

const ALL_STYLE_CONTROLS = Object.keys(sectionTemplateRules.STYLE_TOKENS);
const ALL_LAYOUT_CONTROLS = Object.keys(sectionTemplateRules.LAYOUT_TOKENS);

const STYLE_CONTROLS_BY_TYPE = {
  hero: ["textSize", "titleWeight", "buttonStyle", "colorScheme", "imageRadius"],
  trust_bar: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  card_grid: ["textSize", "titleWeight", "cardStyle", "iconStyle", "colorScheme", "cardSpacing"],
  feature_list: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  capability_matrix: ["textSize", "titleWeight", "cardStyle", "iconStyle", "colorScheme", "cardSpacing"],
  media_feature: ["textSize", "titleWeight", "buttonStyle", "colorScheme", "imageRadius", "cardSpacing"],
  scenario_split: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  workflow_steps: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  module_showcase: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  security_assurance: ["textSize", "titleWeight", "cardStyle", "iconStyle", "colorScheme", "cardSpacing"],
  download_panel: ["textSize", "titleWeight", "buttonStyle", "colorScheme", "cardSpacing"],
  faq_band: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  support_entry: ["textSize", "titleWeight", "cardStyle", "iconStyle", "colorScheme", "cardSpacing"],
  updates_list: ["textSize", "titleWeight", "cardStyle", "colorScheme", "cardSpacing"],
  cta_band: ["textSize", "titleWeight", "buttonStyle", "colorScheme"]
};

const LAYOUT_CONTROLS_BY_TYPE = {
  hero: ["desktopArrangement", "mobileArrangement", "contentAlign", "imagePosition", "entranceAnimation"],
  trust_bar: ["cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  card_grid: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  feature_list: ["desktopArrangement", "mobileArrangement", "contentAlign", "entranceAnimation"],
  capability_matrix: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  media_feature: ["desktopArrangement", "mobileArrangement", "contentAlign", "imagePosition", "entranceAnimation"],
  scenario_split: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  workflow_steps: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  module_showcase: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  security_assurance: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  download_panel: ["desktopArrangement", "mobileArrangement", "contentAlign", "entranceAnimation"],
  faq_band: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  support_entry: ["desktopArrangement", "mobileArrangement", "cardColumns", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  updates_list: ["desktopArrangement", "mobileArrangement", "contentAlign", "entranceAnimation", "hoverIn", "hoverOut"],
  cta_band: ["desktopArrangement", "mobileArrangement", "contentAlign", "entranceAnimation"]
};

const DATA_ATTR_BY_STYLE_TOKEN = {
  textSize: "data-text-size",
  titleWeight: "data-title-weight",
  cardStyle: "data-card-style",
  iconStyle: "data-icon-style",
  buttonStyle: "data-button-style",
  colorScheme: "data-color-scheme",
  imageRadius: "data-image-radius",
  cardSpacing: "data-card-spacing"
};

const DATA_ATTR_BY_LAYOUT_TOKEN = {
  desktopArrangement: "data-desktop-arrangement",
  mobileArrangement: "data-mobile-arrangement",
  cardColumns: "data-card-columns",
  contentAlign: "data-content-align",
  imagePosition: "data-image-position",
  entranceAnimation: "data-entrance-animation",
  hoverIn: "data-hover-in",
  hoverOut: "data-hover-out"
};

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStyleControlsForSection(type) {
  return STYLE_CONTROLS_BY_TYPE[type] || [];
}

function getLayoutControlsForSection(type) {
  return LAYOUT_CONTROLS_BY_TYPE[type] || [];
}

function tokenAllowed(group, key, value) {
  const tokens = group === "layout" ? sectionTemplateRules.LAYOUT_TOKENS : sectionTemplateRules.STYLE_TOKENS;
  if (!Object.prototype.hasOwnProperty.call(tokens, key)) return false;
  const normalizedValue = typeof value === "number" ? value : String(value || "").trim();
  return tokens[key].includes(normalizedValue);
}

function normalizeTokenValue(group, key, value) {
  if (value === "" || value === undefined || value === null) return "";
  if (!tokenAllowed(group, key, value)) return "";
  return typeof value === "number" ? value : String(value).trim();
}

function patchTokenGroup(section, group, key, value) {
  const type = section?.type || "";
  const visibleControls = group === "layout" ? getLayoutControlsForSection(type) : getStyleControlsForSection(type);
  if (!visibleControls.includes(key)) return section;
  if (value !== "" && value !== undefined && value !== null && !tokenAllowed(group, key, value)) return section;

  const normalizedValue = normalizeTokenValue(group, key, value);
  const settings = isObject(section?.settings) ? section.settings : {};
  const currentGroup = isObject(settings[group]) ? settings[group] : {};
  const nextGroup = { ...currentGroup };

  if (normalizedValue === "") {
    delete nextGroup[key];
  } else {
    nextGroup[key] = normalizedValue;
  }

  const nextSettings = { ...settings };
  if (Object.keys(nextGroup).length) {
    nextSettings[group] = nextGroup;
  } else {
    delete nextSettings[group];
  }

  return {
    ...section,
    settings: nextSettings
  };
}

function patchSectionStyleToken(section, key, value) {
  return patchTokenGroup(section, "style", key, value);
}

function patchSectionLayoutToken(section, key, value) {
  return patchTokenGroup(section, "layout", key, value);
}

function normalizedTokenEntries(value, group, visibleControls) {
  const source = isObject(value) ? value : {};
  return Object.entries(source)
    .map(([key, child]) => [key, normalizeTokenValue(group, key, child)])
    .filter(([key, child]) => visibleControls.includes(key) && child !== "");
}

function getSectionRenderAttributes(section = {}) {
  const styleControls = getStyleControlsForSection(section.type);
  const layoutControls = getLayoutControlsForSection(section.type);
  const styleEntries = normalizedTokenEntries(section.settings?.style, "style", styleControls);
  const layoutEntries = normalizedTokenEntries(section.settings?.layout, "layout", layoutControls);
  const attributes = {};

  for (const [key, value] of styleEntries) {
    const attr = DATA_ATTR_BY_STYLE_TOKEN[key];
    if (attr) attributes[attr] = String(value);
  }
  for (const [key, value] of layoutEntries) {
    const attr = DATA_ATTR_BY_LAYOUT_TOKEN[key];
    if (attr) attributes[attr] = String(value);
  }

  return {
    className: Object.keys(attributes).length ? "cms-section-settings" : "",
    attributes
  };
}

function sanitizeAnchorId(value) {
  const safe = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 80);
  if (!safe || !/^[A-Za-z]/.test(safe)) return "";
  return safe;
}

module.exports = {
  ALL_LAYOUT_CONTROLS,
  ALL_STYLE_CONTROLS,
  getLayoutControlsForSection,
  getSectionRenderAttributes,
  getStyleControlsForSection,
  patchSectionLayoutToken,
  patchSectionStyleToken,
  sanitizeAnchorId
};
