const {
  AI_LAYOUT_ELEMENT_TYPES,
  AI_LAYOUT_ELEMENT_ROLES
} = require("./ai-layout-section.cjs");

const AI_LAYOUT_STYLE_SCOPES = ["element", "sameType", "section"];
const AI_LAYOUT_STYLE_RECORD_KEYS = [
  "textSize",
  "weight",
  "align",
  "tone",
  "radius",
  "variant",
  "fill",
  "padding",
  "fit",
  "lineClamp",
  "shadow",
  "hover",
  "border",
  "gap"
];

const DEFAULT_BOX_BY_TYPE = {
  text: { x: 0.24, y: 0.18, width: 0.52, height: 0.08 },
  badge: { x: 0.43, y: 0.1, width: 0.14, height: 0.04 },
  button: { x: 0.44, y: 0.34, width: 0.16, height: 0.07 },
  image: { x: 0.2, y: 0.5, width: 0.6, height: 0.3 },
  card: { x: 0.18, y: 0.48, width: 0.24, height: 0.34 },
  icon: { x: 0.45, y: 0.44, width: 0.08, height: 0.08 }
};

const DEFAULT_APPEARANCE_BY_TYPE = {
  text: { variant: "plain", align: "center", tone: "default", textSize: "md", weight: "600" },
  badge: { variant: "plain", align: "center", tone: "purple", textSize: "xs", weight: "700" },
  button: { variant: "solid", fill: "purple", radius: "medium", padding: "sm", shadow: "subtle", hover: "lift" },
  image: { variant: "placeholder-solid", fill: "purple", radius: "medium", fit: "placeholder" },
  card: { variant: "soft", fill: "surface", radius: "medium", padding: "md", shadow: "subtle", border: "subtle" },
  icon: { variant: "soft", fill: "purple", radius: "medium", padding: "xs" }
};

const BUILT_IN_STYLE_RECORDS = [
  {
    id: "system-ai-style-screenshot",
    name: "Screenshot recognition style",
    scope: "element",
    targetType: "text",
    targetRole: "body",
    appearance: { variant: "plain", tone: "default", align: "center" },
    tags: ["ai", "screenshot"],
    isSystem: true
  },
  {
    id: "system-ai-style-brand-cta",
    name: "Brand purple CTA",
    scope: "sameType",
    targetType: "button",
    targetRole: "cta",
    appearance: { variant: "solid", fill: "purple", radius: "medium", padding: "sm", shadow: "medium", hover: "lift" },
    tags: ["cta", "brand"],
    isSystem: true
  },
  {
    id: "system-ai-style-pricing-card",
    name: "Pricing card style",
    scope: "sameType",
    targetType: "card",
    targetRole: "card",
    appearance: { variant: "soft", fill: "surface", radius: "medium", padding: "md", shadow: "subtle", border: "subtle", gap: "normal" },
    tags: ["pricing", "card"],
    isSystem: true
  }
];

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanId(value, fallback) {
  const id = cleanText(value, 80).replace(/[^A-Za-z0-9_-]/g, "");
  return id || fallback;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return round(Math.min(max, Math.max(min, number)));
}

function normalizeBox(value = {}, fallback = {}) {
  const source = isObject(value) ? value : {};
  const base = isObject(fallback) ? fallback : {};
  const x = clamp(source.x ?? base.x, 0, 0.98, 0.08);
  const y = clamp(source.y ?? base.y, 0, 0.98, 0.08);
  let width = clamp(source.width ?? source.w ?? base.width, 0.02, 1, 0.24);
  let height = clamp(source.height ?? source.h ?? base.height, 0.02, 1, 0.1);
  if (x + width > 1) width = round(Math.max(0.02, 1 - x));
  if (y + height > 1) height = round(Math.max(0.02, 1 - y));
  return { x, y, width, height };
}

function roleForElement(element = {}) {
  if (AI_LAYOUT_ELEMENT_ROLES.includes(element.role)) return element.role;
  if (element.type === "badge") return "eyebrow";
  if (element.type === "button") return "cta";
  if (element.type === "image") return "media";
  if (element.type === "card") return "card";
  if (element.type === "icon") return "decorative";
  return "body";
}

function cleanAppearance(appearance = {}) {
  if (!isObject(appearance)) return {};
  const cleaned = {};
  for (const key of AI_LAYOUT_STYLE_RECORD_KEYS) {
    if (appearance[key] !== undefined && appearance[key] !== null && appearance[key] !== "") {
      cleaned[key] = String(appearance[key]).slice(0, 40);
    }
  }
  return cleaned;
}

function getAiLayoutElements(section = {}) {
  return Array.isArray(section.content?.elements) ? section.content.elements : [];
}

function patchAiLayoutElements(section = {}, mapper) {
  const elements = getAiLayoutElements(section);
  return {
    ...section,
    content: {
      ...(section.content || {}),
      elements: elements.map(mapper)
    }
  };
}

function patchAiLayoutElement(section = {}, elementId, updater) {
  return patchAiLayoutElements(section, (element, index) => (
    element.id === elementId ? updater(element, index) : element
  ));
}

function patchAiLayoutElementBox(section = {}, elementId, boxPatch = {}) {
  const elements = getAiLayoutElements(section);
  const source = elements.find((element) => element.id === elementId);
  const sourceBox = normalizeBox(source?.box || {}, DEFAULT_BOX_BY_TYPE[source?.type] || DEFAULT_BOX_BY_TYPE.text);
  const nextSourceBox = normalizeBox({ ...sourceBox, ...boxPatch }, sourceBox);
  const deltaX = nextSourceBox.x - sourceBox.x;
  const deltaY = nextSourceBox.y - sourceBox.y;
  const shouldMoveGroup = Boolean(source?.groupId && source.type === "card" && (deltaX || deltaY));

  return patchAiLayoutElements(section, (element) => {
    if (element.locked) return element;
    if (shouldMoveGroup && element.groupId === source.groupId && element.id !== elementId) {
      const box = normalizeBox(element.box, DEFAULT_BOX_BY_TYPE[element.type]);
      return {
        ...element,
        originalBox: element.originalBox || element.box || DEFAULT_BOX_BY_TYPE[element.type] || DEFAULT_BOX_BY_TYPE.text,
        box: normalizeBox({ ...box, x: box.x + deltaX, y: box.y + deltaY }, box)
      };
    }
    if (element.id !== elementId) return element;
    return {
      ...element,
      originalBox: element.originalBox || element.box || DEFAULT_BOX_BY_TYPE[element.type] || DEFAULT_BOX_BY_TYPE.text,
      box: nextSourceBox
    };
  });
}

function patchAiLayoutElementAppearance(section = {}, elementId, appearancePatch = {}, scope = "element") {
  const elements = getAiLayoutElements(section);
  const source = elements.find((element) => element.id === elementId);
  if (!source) return section;
  const safeScope = AI_LAYOUT_STYLE_SCOPES.includes(scope) ? scope : "element";
  const sourceRole = roleForElement(source);
  const shouldPatch = (element) => {
    if (safeScope === "section") return true;
    if (safeScope === "sameType") return element.type === source.type && roleForElement(element) === sourceRole;
    return element.id === elementId;
  };
  const cleanedPatch = cleanAppearance(appearancePatch);

  return patchAiLayoutElements(section, (element) => (
    shouldPatch(element)
      ? { ...element, appearance: { ...(element.appearance || {}), ...cleanedPatch } }
      : element
  ));
}

function createAiLayoutElement(type = "text", options = {}) {
  const safeType = AI_LAYOUT_ELEMENT_TYPES.includes(type) ? type : "text";
  const id = cleanId(options.id, `ai-${safeType}-${Date.now()}`);
  const role = options.role && AI_LAYOUT_ELEMENT_ROLES.includes(options.role)
    ? options.role
    : roleForElement({ type: safeType });
  const element = {
    id,
    type: safeType,
    role,
    label: cleanText(options.label, 80),
    box: normalizeBox(options.box, DEFAULT_BOX_BY_TYPE[safeType]),
    zIndex: clamp(options.zIndex, 0, 20, 5),
    appearance: {
      ...(DEFAULT_APPEARANCE_BY_TYPE[safeType] || {}),
      ...cleanAppearance(options.appearance)
    }
  };
  if (["text", "badge", "card"].includes(safeType)) element.text = cleanText(options.text || "New element", 500);
  if (safeType === "button") {
    element.text = cleanText(options.text || "Action", 120);
    element.href = cleanText(options.href, 240);
  }
  if (safeType === "image") {
    element.alt = cleanText(options.alt || "Image placeholder", 180);
    element.imagePath = cleanText(options.imagePath, 500);
    element.imageUrl = cleanText(options.imageUrl, 500);
  }
  if (safeType === "icon") {
    element.icon = cleanText(options.icon || "✓", 24);
  }
  element.originalBox = element.box;
  return element;
}

function addAiLayoutElement(section = {}, type = "text") {
  const elements = getAiLayoutElements(section);
  const element = createAiLayoutElement(type, { zIndex: Math.min(20, elements.length + 1) });
  return {
    section: {
      ...section,
      content: {
        ...(section.content || {}),
        elements: [...elements, element].slice(0, 32)
      }
    },
    element
  };
}

function duplicateAiLayoutElement(section = {}, elementId) {
  const elements = getAiLayoutElements(section);
  const index = elements.findIndex((element) => element.id === elementId);
  if (index < 0 || elements.length >= 32) return { section, element: null };
  const source = elements[index];
  const shiftedBox = normalizeBox({
    ...(source.box || {}),
    x: Number(source.box?.x || 0) + 0.02,
    y: Number(source.box?.y || 0) + 0.02
  }, source.box || DEFAULT_BOX_BY_TYPE[source.type]);
  const copy = {
    ...clone(source),
    id: `${source.id || source.type}-copy-${Date.now()}`,
    label: source.label ? `${source.label} copy` : source.label,
    box: shiftedBox,
    originalBox: shiftedBox,
    zIndex: clamp((source.zIndex || index + 1) + 1, 0, 20, index + 2)
  };
  const nextElements = [...elements];
  nextElements.splice(index + 1, 0, copy);
  return {
    section: {
      ...section,
      content: {
        ...(section.content || {}),
        elements: nextElements
      }
    },
    element: copy
  };
}

function removeAiLayoutElement(section = {}, elementId) {
  return {
    ...section,
    content: {
      ...(section.content || {}),
      elements: getAiLayoutElements(section).filter((element) => element.id !== elementId)
    }
  };
}

function restoreAiLayoutElementBox(section = {}, elementId) {
  return patchAiLayoutElement(section, elementId, (element) => ({
    ...element,
    box: normalizeBox(element.originalBox || element.box, element.box)
  }));
}

function moveAiLayoutElementLayer(section = {}, elementId, direction = "up") {
  return patchAiLayoutElement(section, elementId, (element) => {
    const delta = direction === "down" ? -1 : 1;
    return { ...element, zIndex: clamp(Number(element.zIndex || 0) + delta, 0, 20, 0) };
  });
}

function resetAiLayoutElementAppearance(section = {}, elementId, scope = "element") {
  const elements = getAiLayoutElements(section);
  const source = elements.find((element) => element.id === elementId);
  if (!source) return section;
  const safeScope = AI_LAYOUT_STYLE_SCOPES.includes(scope) ? scope : "element";
  const sourceRole = roleForElement(source);
  return patchAiLayoutElements(section, (element) => {
    const shouldReset = safeScope === "section"
      || (safeScope === "sameType" && element.type === source.type && roleForElement(element) === sourceRole)
      || (safeScope === "element" && element.id === elementId);
    return shouldReset ? { ...element, appearance: {} } : element;
  });
}

function toggleAiLayoutElementLock(section = {}, elementId) {
  return patchAiLayoutElement(section, elementId, (element) => ({
    ...element,
    locked: !element.locked
  }));
}

function createAiLayoutStyleRecord({ name, scope = "element", element, tags = [] } = {}) {
  if (!element) return null;
  const safeScope = AI_LAYOUT_STYLE_SCOPES.includes(scope) ? scope : "element";
  return {
    id: `ai-style-${Date.now()}`,
    name: cleanText(name, 40) || "AI layout style",
    scope: safeScope,
    targetType: element.type || "text",
    targetRole: roleForElement(element),
    appearance: cleanAppearance(element.appearance || {}),
    tags: Array.isArray(tags)
      ? tags.map((tag) => cleanText(tag, 24)).filter(Boolean).slice(0, 8)
      : [],
    createdAt: new Date().toISOString()
  };
}

function applyAiLayoutStyleRecord(section = {}, record = {}, targetElementId = "", scope = "") {
  const elements = getAiLayoutElements(section);
  const selected = elements.find((element) => element.id === targetElementId);
  const safeScope = AI_LAYOUT_STYLE_SCOPES.includes(scope)
    ? scope
    : AI_LAYOUT_STYLE_SCOPES.includes(record.scope)
      ? record.scope
      : "element";
  const targetRole = selected ? roleForElement(selected) : record.targetRole;
  const targetType = selected?.type || record.targetType;
  const appearance = cleanAppearance(record.appearance || {});

  if (!Object.keys(appearance).length) return section;

  return patchAiLayoutElements(section, (element) => {
    const role = roleForElement(element);
    const shouldApply = safeScope === "section"
      || (safeScope === "sameType" && element.type === targetType && role === targetRole)
      || (safeScope === "element" && element.id === targetElementId);
    return shouldApply
      ? { ...element, appearance: { ...(element.appearance || {}), ...appearance } }
      : element;
  });
}

module.exports = {
  AI_LAYOUT_STYLE_RECORD_KEYS,
  AI_LAYOUT_STYLE_SCOPES,
  BUILT_IN_STYLE_RECORDS,
  addAiLayoutElement,
  applyAiLayoutStyleRecord,
  createAiLayoutElement,
  createAiLayoutStyleRecord,
  duplicateAiLayoutElement,
  getAiLayoutElements,
  moveAiLayoutElementLayer,
  normalizeBox,
  patchAiLayoutElement,
  patchAiLayoutElementAppearance,
  patchAiLayoutElementBox,
  resetAiLayoutElementAppearance,
  removeAiLayoutElement,
  restoreAiLayoutElementBox,
  roleForElement,
  toggleAiLayoutElementLock
};
