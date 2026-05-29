const {
  LAYOUT_TOKENS,
  SECTION_TEMPLATE_INDUSTRIES,
  SECTION_TEMPLATE_RISK_FLAGS,
  SECTION_VARIANTS,
  SITE_SECTION_TYPES,
  STYLE_TOKENS,
  normalizeSectionTemplateInput
} = require("./section-template-rules.cjs");

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const RECOGNITION_UNAVAILABLE_CODE = "recognitionUnavailable";
const RECOGNITION_TIMEOUT_CODE = "recognition_timeout";
const DEFAULT_RECOGNITION_TIMEOUT_MS = 45000;
const ALLOWED_SCREENSHOT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_SCREENSHOT_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const SUPPORTED_PAGE_KEYS = new Set(["home", "product"]);
const DEFAULT_MODEL = "";

function clean(value) {
  const normalized = String(value || "").trim();
  if (normalized === "\"\"" || normalized === "''") return "";
  return normalized;
}

function uniqueList(values, limit = 12) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((item) => clean(item))
    .filter(Boolean))]
    .slice(0, limit);
}

function recognitionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getFileExtension(file) {
  const name = clean(file?.name).toLowerCase();
  const extension = name.includes(".") ? name.split(".").pop() : "";
  return extension || "";
}

function validateScreenshotFileInput(file) {
  if (!file || typeof file !== "object") {
    return { ok: false, code: "screenshot_required", message: "Screenshot is required." };
  }
  if (!file.size || file.size <= 0) {
    return { ok: false, code: "screenshot_empty", message: "Screenshot is empty." };
  }
  if (file.size > MAX_SCREENSHOT_SIZE) {
    return { ok: false, code: "screenshot_too_large", message: "Screenshot must be 5 MB or smaller." };
  }

  const mimeType = clean(file.type).toLowerCase();
  const extension = getFileExtension(file);
  if (!ALLOWED_SCREENSHOT_MIME_TYPES.has(mimeType) && !ALLOWED_SCREENSHOT_EXTENSIONS.has(extension)) {
    return { ok: false, code: "screenshot_type", message: "Screenshot must be PNG, JPG, JPEG, or WEBP." };
  }

  return { ok: true };
}

function getSectionTemplateRecognitionSettings(env = process.env) {
  const enabled = clean(env.OPENAI_SECTION_TEMPLATE_ENABLED).toLowerCase() !== "false";
  const model = clean(env.OPENAI_SECTION_TEMPLATE_MODEL) || DEFAULT_MODEL;
  const hasApiKey = Boolean(clean(env.OPENAI_API_KEY));
  const timeoutMs = normalizeRecognitionTimeoutMs(env.OPENAI_SECTION_TEMPLATE_TIMEOUT_MS);

  return {
    provider: "OpenAI",
    enabled,
    hasApiKey,
    model,
    timeoutMs,
    configured: enabled && hasApiKey && Boolean(model)
  };
}

function normalizeRecognitionTimeoutMs(value) {
  const normalized = clean(value);
  if (!normalized) return DEFAULT_RECOGNITION_TIMEOUT_MS;
  const timeoutMs = Number(normalized);
  if (!Number.isFinite(timeoutMs)) return DEFAULT_RECOGNITION_TIMEOUT_MS;
  return Math.min(120000, Math.max(5000, Math.round(timeoutMs)));
}

function normalizeRecognitionRequestFields(input = {}) {
  const industry = clean(input.industry);
  const sectionTypeHint = clean(input.sectionTypeHint);
  const pageKey = clean(input.pageKey);

  return {
    locale: clean(input.locale).slice(0, 32) || "en",
    pageKey: SUPPORTED_PAGE_KEYS.has(pageKey) ? pageKey : "",
    industry: SECTION_TEMPLATE_INDUSTRIES.includes(industry) ? industry : "custom",
    sectionTypeHint: SITE_SECTION_TYPES.includes(sectionTypeHint) ? sectionTypeHint : "auto",
    purposeHint: clean(input.purposeHint).slice(0, 80)
  };
}

function buildRecognitionPrompt(fields = {}) {
  return [
    "You are converting one website section screenshot into a safe Aifar page-designer section template.",
    "Return only one candidate section. If the screenshot contains multiple sections, choose the most visually dominant one and include manual_review_required.",
    "Use neutral placeholder copy when text is unclear. Do not reuse brand assets, copyrighted imagery, external URLs, HTML, CSS, or JavaScript.",
    "External links must be returned as empty strings or safe site-relative paths such as /contact/ or /downloads/.",
    `Locale: ${fields.locale || "en"}. Page key: ${fields.pageKey || "general"}. Industry: ${fields.industry || "custom"}.`,
    `Section type hint: ${fields.sectionTypeHint || "auto"}. Purpose hint: ${fields.purposeHint || "none"}.`,
    `Allowed section types: ${SITE_SECTION_TYPES.join(", ")}.`,
    `Allowed variants by section type: ${JSON.stringify(SECTION_VARIANTS)}.`,
    `Allowed style tokens: ${JSON.stringify(STYLE_TOKENS)}.`,
    `Allowed layout tokens: ${JSON.stringify(LAYOUT_TOKENS)}.`,
    `Allowed risk flags: ${SECTION_TEMPLATE_RISK_FLAGS.join(", ")}.`,
    "The section object must contain id, type, variant, settings, and content. Use empty image paths and descriptive alt text instead of copying source images."
  ].join("\n");
}

function buildRecognitionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["template", "recognition"],
    properties: {
      template: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "purpose", "tags", "section"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          purpose: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          section: {
            type: "object",
            additionalProperties: true
          }
        }
      },
      recognition: {
        type: "object",
        additionalProperties: false,
        required: ["confidence", "notes", "detectedSectionType", "riskFlags"],
        properties: {
          confidence: { type: "number" },
          notes: {
            type: "array",
            items: { type: "string" }
          },
          detectedSectionType: { type: "string" },
          riskFlags: {
            type: "array",
            items: {
              type: "string",
              enum: SECTION_TEMPLATE_RISK_FLAGS
            }
          }
        }
      }
    }
  };
}

function buildOpenAIRecognitionPayload({ model, dataUrl, fields }) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You create safe, reviewable page-designer section templates from screenshots. Always obey the provided JSON schema and local whitelist constraints."
          }
        ]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildRecognitionPrompt(fields) },
          { type: "input_image", image_url: dataUrl, detail: "high" }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "section_template_recognition",
        strict: false,
        schema: buildRecognitionSchema()
      }
    },
    max_output_tokens: 2400
  };
}

function parseJsonText(text) {
  const value = clean(text);
  if (!value) return null;
  const stripped = value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(stripped);
}

function extractResponseJson(responseJson) {
  if (!responseJson || typeof responseJson !== "object") {
    throw recognitionError("invalid_recognition_response", "Recognition response is empty.");
  }

  if (typeof responseJson.output_text === "string") {
    return parseJsonText(responseJson.output_text);
  }

  const stack = Array.isArray(responseJson.output) ? [...responseJson.output] : [];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;
    if (typeof current.text === "string") {
      return parseJsonText(current.text);
    }
    if (typeof current.content === "string") {
      return parseJsonText(current.content);
    }
    if (Array.isArray(current.content)) {
      stack.unshift(...current.content);
    }
    if (Array.isArray(current.output)) {
      stack.unshift(...current.output);
    }
  }

  throw recognitionError("invalid_recognition_response", "Recognition response did not include JSON output.");
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

function isLinkLikeKey(key) {
  return /(href|url|link)$/i.test(key) || /(href|url|link)/i.test(key);
}

function sanitizeExternalLinks(value, state = { removed: false }, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeExternalLinks(item, state, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeExternalLinks(childValue, state, childKey)
      ])
    );
  }
  if (typeof value === "string" && (isExternalUrl(value.trim()) || (isLinkLikeKey(key) && isExternalUrl(value.trim())))) {
    state.removed = true;
    return "";
  }
  return value;
}

function normalizeConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return 0;
  return Math.max(0, Math.min(1, confidence));
}

function normalizeRecognitionCandidate(result, fields = {}, sourceImage = {}) {
  if (!result || typeof result !== "object" || !result.template || !result.recognition) {
    throw recognitionError("invalid_recognition_response", "Recognition response is missing template data.");
  }

  const linkState = { removed: false };
  const section = sanitizeExternalLinks(result.template.section, linkState);
  const confidence = normalizeConfidence(result.recognition.confidence);
  const riskFlags = new Set([
    "manual_review_required",
    ...uniqueList(result.recognition.riskFlags, 12)
  ]);

  if (confidence < 0.7) riskFlags.add("low_confidence");
  if (linkState.removed) riskFlags.add("external_links_removed");

  const normalized = normalizeSectionTemplateInput({
    name: clean(result.template.name) || "AI recognized section",
    description: clean(result.template.description) || "AI recognized candidate section.",
    industry: fields.industry || "custom",
    purpose: fields.purposeHint || clean(result.template.purpose) || "screenshot_recognition",
    tags: uniqueList([...(Array.isArray(result.template.tags) ? result.template.tags : []), "ai", "screenshot"], 16),
    source: "ai",
    status: "pending_review",
    riskFlags: [...riskFlags],
    content: section
  });

  return {
    candidate: {
      id: `ai-section-template-preview-${Date.now()}`,
      ...normalized,
      source: "ai",
      status: "pending_review",
      isSystem: false,
      pageKey: fields.pageKey || null
    },
    recognition: {
      confidence,
      notes: uniqueList(result.recognition.notes, 8),
      detectedSectionType: SITE_SECTION_TYPES.includes(clean(result.recognition.detectedSectionType))
        ? clean(result.recognition.detectedSectionType)
        : normalized.content.sections[0]?.type || "",
      sourceImage
    }
  };
}

function createDataUrl(buffer, mimeType) {
  return `data:${clean(mimeType) || "image/png"};base64,${Buffer.from(buffer).toString("base64")}`;
}

module.exports = {
  ALLOWED_SCREENSHOT_EXTENSIONS,
  ALLOWED_SCREENSHOT_MIME_TYPES,
  DEFAULT_MODEL,
  DEFAULT_RECOGNITION_TIMEOUT_MS,
  MAX_SCREENSHOT_SIZE,
  RECOGNITION_TIMEOUT_CODE,
  RECOGNITION_UNAVAILABLE_CODE,
  SUPPORTED_PAGE_KEYS,
  buildOpenAIRecognitionPayload,
  buildRecognitionPrompt,
  buildRecognitionSchema,
  createDataUrl,
  extractResponseJson,
  getSectionTemplateRecognitionSettings,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
};
