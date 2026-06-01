const AI_LAYOUT_SECTION_TYPE = "ai_layout";
const AI_LAYOUT_VARIANT = "screenshot_composition";

const AI_LAYOUT_ELEMENT_TYPES = ["text", "button", "image", "card", "badge", "icon"];
const AI_LAYOUT_ELEMENT_ROLES = ["eyebrow", "headline", "body", "cta", "media", "card", "decorative"];
const AI_LAYOUT_CANVAS_BACKGROUNDS = ["default", "soft", "brand", "neutral", "transparent"];
const AI_LAYOUT_CANVAS_PADDING = ["none", "compact", "normal", "relaxed"];
const AI_LAYOUT_CANVAS_MAX_WIDTH = ["content", "wide"];
const AI_LAYOUT_MOBILE_MODES = ["scale", "stack"];
const AI_LAYOUT_TEXT_SIZES = ["xs", "sm", "md", "lg", "xl"];
const AI_LAYOUT_TEXT_WEIGHTS = ["400", "500", "600", "700", "800"];
const AI_LAYOUT_ALIGNMENTS = ["left", "center", "right"];
const AI_LAYOUT_TONES = ["default", "muted", "brand", "purple", "inverted", "surface"];
const AI_LAYOUT_RADII = ["none", "small", "medium", "large"];
const AI_LAYOUT_APPEARANCE_VARIANTS = ["plain", "pill", "solid", "soft", "outline", "placeholder-solid", "placeholder-soft"];
const AI_LAYOUT_FILLS = ["default", "brand", "purple", "blue", "neutral", "surface"];
const AI_LAYOUT_PADDING = ["none", "xs", "sm", "md"];
const AI_LAYOUT_FITS = ["cover", "contain", "placeholder"];
const AI_LAYOUT_LINE_CLAMPS = ["none", "1", "2", "3", "4"];

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
  "style",
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

function layoutError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertSafeKey(key, path) {
  const safeKey = clean(key);
  if (!safeKey || FORBIDDEN_KEYS.has(safeKey) || /^on[A-Z]/.test(safeKey)) {
    throw layoutError("unsafe_ai_layout_key", `Unsafe AI layout key at ${path}.`);
  }
}

function assertSafeString(value, path) {
  for (const pattern of UNSAFE_STRING_PATTERNS) {
    if (pattern.test(value)) {
      throw layoutError("unsafe_ai_layout_value", `Unsafe AI layout value at ${path}.`);
    }
  }
}

function safeText(value, path, maxLength = 500) {
  const next = clean(value).slice(0, maxLength);
  if (next) assertSafeString(next, path);
  return next;
}

function safeId(value, fallback) {
  const id = clean(value)
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 80);
  return id || fallback;
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function numberInRange(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return round(Math.min(max, Math.max(min, number)));
}

function integerInRange(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function token(value, allowed, fallback) {
  const next = clean(value);
  return allowed.includes(next) ? next : fallback;
}

function safeHref(value) {
  const href = safeText(value, "aiLayout.href", 240);
  if (!href) return "";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  return "";
}

function normalizeBox(value = {}, fallback = {}) {
  const source = isObject(value) ? value : {};
  const x = numberInRange(source.x ?? fallback.x, 0.08, 0, 0.98);
  const y = numberInRange(source.y ?? fallback.y, 0.08, 0, 0.98);
  let width = numberInRange(source.width ?? source.w ?? fallback.width, 0.36, 0.02, 1);
  let height = numberInRange(source.height ?? source.h ?? fallback.height, 0.12, 0.02, 1);

  if (x + width > 1) width = round(Math.max(0.02, 1 - x));
  if (y + height > 1) height = round(Math.max(0.02, 1 - y));

  return { x, y, width, height };
}

function normalizeElementStyle(value = {}) {
  if (!isObject(value)) return {};
  const normalized = {};
  const allowedKeys = new Set(["textSize", "weight", "align", "tone", "radius", "variant", "fill", "padding", "fit", "lineClamp"]);

  for (const key of Object.keys(value)) {
    assertSafeKey(key, `aiLayout.element.appearance.${key}`);
    if (!allowedKeys.has(key)) continue;
    if (key === "textSize") normalized.textSize = token(value[key], AI_LAYOUT_TEXT_SIZES, "");
    if (key === "weight") normalized.weight = token(String(value[key]), AI_LAYOUT_TEXT_WEIGHTS, "");
    if (key === "align") normalized.align = token(value[key], AI_LAYOUT_ALIGNMENTS, "");
    if (key === "tone") normalized.tone = token(value[key], AI_LAYOUT_TONES, "");
    if (key === "radius") normalized.radius = token(value[key], AI_LAYOUT_RADII, "");
    if (key === "variant") normalized.variant = token(value[key], AI_LAYOUT_APPEARANCE_VARIANTS, "");
    if (key === "fill") normalized.fill = token(value[key], AI_LAYOUT_FILLS, "");
    if (key === "padding") normalized.padding = token(value[key], AI_LAYOUT_PADDING, "");
    if (key === "fit") normalized.fit = token(value[key], AI_LAYOUT_FITS, "");
    if (key === "lineClamp") normalized.lineClamp = token(String(value[key]), AI_LAYOUT_LINE_CLAMPS, "");
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, child]) => child));
}

function normalizeAiLayoutElement(element, index = 0) {
  if (!isObject(element)) {
    throw layoutError("invalid_ai_layout_element", "AI layout element must be an object.");
  }

  for (const key of Object.keys(element)) {
    assertSafeKey(key, `aiLayout.elements[${index}].${key}`);
  }

  const type = token(element.type || element.kind, AI_LAYOUT_ELEMENT_TYPES, "");
  if (!type) {
    throw layoutError("invalid_ai_layout_element_type", "Unsupported AI layout element type.");
  }

  const fallbackBox = {
    x: element.x,
    y: element.y,
    width: element.width ?? element.w,
    height: element.height ?? element.h
  };
  const normalized = {
    id: safeId(element.id, `${type}-${index + 1}`),
    type,
    box: normalizeBox(element.box, fallbackBox),
    zIndex: integerInRange(element.zIndex ?? element.z, index + 1, 0, 20)
  };
  const role = token(element.role, AI_LAYOUT_ELEMENT_ROLES, "");
  if (role) normalized.role = role;
  const appearance = normalizeElementStyle(element.appearance || element.elementStyle || {});
  if (Object.keys(appearance).length) normalized.appearance = appearance;

  if (["text", "button", "badge", "card"].includes(type)) {
    normalized.text = safeText(element.text || element.label || element.title, `aiLayout.elements[${index}].text`, 900);
  }
  if (type === "button") {
    normalized.href = safeHref(element.href || element.link || element.url);
  }
  if (type === "icon") {
    normalized.icon = safeText(element.icon || element.text || element.label, `aiLayout.elements[${index}].icon`, 24);
    normalized.label = safeText(element.label || element.alt || element.text, `aiLayout.elements[${index}].label`, 120);
  }
  if (type === "image") {
    normalized.imagePath = safeText(element.imagePath || element.path, `aiLayout.elements[${index}].imagePath`, 500);
    normalized.imageUrl = safeHref(element.imageUrl || element.url || element.src);
    normalized.alt = safeText(element.alt || element.imageAlt || element.label, `aiLayout.elements[${index}].alt`, 180);
  }

  return normalized;
}

function normalizeAiLayoutElements(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.slice(0, 32).map((element, index) => normalizeAiLayoutElement(element, index));
}

function normalizeAiLayoutCanvas(value = {}) {
  const source = isObject(value) ? value : {};
  for (const key of Object.keys(source)) {
    assertSafeKey(key, `aiLayout.canvas.${key}`);
  }

  const sourceWidth = integerInRange(source.sourceWidth || source.referenceWidth, 0, 0, 4096);
  const sourceHeight = integerInRange(source.sourceHeight || source.referenceHeight, 0, 0, 4096);
  const ratioFromSource = sourceWidth && sourceHeight ? sourceWidth / sourceHeight : 0;
  const aspectRatio = numberInRange(source.aspectRatio || source.ratio || ratioFromSource, 1.6, 0.45, 3.2);
  const normalized = {
    aspectRatio,
    background: token(source.background, AI_LAYOUT_CANVAS_BACKGROUNDS, "default"),
    padding: token(source.padding, AI_LAYOUT_CANVAS_PADDING, "normal"),
    maxWidth: token(source.maxWidth, AI_LAYOUT_CANVAS_MAX_WIDTH, "content"),
    mobileMode: token(source.mobileMode, AI_LAYOUT_MOBILE_MODES, "scale")
  };

  if (sourceWidth) normalized.sourceWidth = sourceWidth;
  if (sourceHeight) normalized.sourceHeight = sourceHeight;
  return normalized;
}

function normalizeAiLayoutContent(value = {}) {
  const source = isObject(value) ? value : {};
  for (const key of Object.keys(source)) {
    assertSafeKey(key, `aiLayout.content.${key}`);
  }

  return {
    canvas: normalizeAiLayoutCanvas(source.canvas || {}),
    elements: normalizeAiLayoutElements(source.elements || [])
  };
}

module.exports = {
  AI_LAYOUT_APPEARANCE_VARIANTS,
  AI_LAYOUT_CANVAS_BACKGROUNDS,
  AI_LAYOUT_CANVAS_MAX_WIDTH,
  AI_LAYOUT_CANVAS_PADDING,
  AI_LAYOUT_ELEMENT_ROLES,
  AI_LAYOUT_ELEMENT_TYPES,
  AI_LAYOUT_FILLS,
  AI_LAYOUT_FITS,
  AI_LAYOUT_LINE_CLAMPS,
  AI_LAYOUT_MOBILE_MODES,
  AI_LAYOUT_PADDING,
  AI_LAYOUT_SECTION_TYPE,
  AI_LAYOUT_VARIANT,
  normalizeAiLayoutCanvas,
  normalizeAiLayoutContent,
  normalizeAiLayoutElement,
  normalizeAiLayoutElements
};
