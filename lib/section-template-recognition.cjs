const {
  LAYOUT_TOKENS,
  SECTION_TEMPLATE_INDUSTRIES,
  SECTION_TEMPLATE_RISK_FLAGS,
  SECTION_VARIANTS,
  SITE_SECTION_TYPES,
  STYLE_TOKENS,
  normalizeSectionTemplateInput
} = require("./section-template-rules.cjs");
const providerSettings = require("./ai-provider-settings.cjs");

const {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  cleanEnvValue,
  firstCleanEnvValue,
  getProviderApiKey,
  getProviderBaseUrl,
  normalizeAiProvider,
  readEnabledFlag
} = providerSettings;

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const RECOGNITION_UNAVAILABLE_CODE = "recognitionUnavailable";
const RECOGNITION_TIMEOUT_CODE = "recognition_timeout";
const DEFAULT_RECOGNITION_TIMEOUT_MS = 45000;
const ALLOWED_SCREENSHOT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_SCREENSHOT_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const SUPPORTED_PAGE_KEYS = new Set(["home", "product"]);
const DEFAULT_MODEL = "";
const UAT_RECOGNITION_MODEL = "local-uat-section-template";

function clean(value) {
  return cleanEnvValue(value);
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
  const providerKey = normalizeAiProvider(env.AI_SECTION_TEMPLATE_PROVIDER);
  const enabled = readEnabledFlag(env, [
    "AI_SECTION_TEMPLATE_ENABLED",
    providerKey === AI_PROVIDERS.siliconflow ? "SILICONFLOW_SECTION_TEMPLATE_ENABLED" : "OPENAI_SECTION_TEMPLATE_ENABLED",
    "OPENAI_SECTION_TEMPLATE_ENABLED"
  ], true);
  const apiKey = getProviderApiKey(env, providerKey);
  const timeoutMs = normalizeRecognitionTimeoutMs(firstCleanEnvValue(
    env.AI_SECTION_TEMPLATE_TIMEOUT_MS,
    providerKey === AI_PROVIDERS.siliconflow ? env.SILICONFLOW_TIMEOUT_MS : "",
    env.OPENAI_SECTION_TEMPLATE_TIMEOUT_MS
  ));
  const uatMode = getSectionTemplateRecognitionUatMode(env);
  const openAiModel = clean(firstCleanEnvValue(env.AI_SECTION_TEMPLATE_MODEL, env.OPENAI_SECTION_TEMPLATE_MODEL)) || DEFAULT_MODEL;
  const siliconFlowVisionModel = clean(env.SILICONFLOW_VISION_MODEL);
  const siliconFlowTextModel = clean(env.SILICONFLOW_TEXT_MODEL);
  const modelIds = providerKey === AI_PROVIDERS.siliconflow
    ? [siliconFlowVisionModel, siliconFlowTextModel].filter(Boolean)
    : (openAiModel ? [openAiModel] : []);
  const model = providerKey === AI_PROVIDERS.siliconflow
    ? modelIds.join(" + ")
    : openAiModel;

  return {
    providerKey,
    provider: AI_PROVIDER_LABELS[providerKey],
    baseUrl: getProviderBaseUrl(env, providerKey),
    enabled,
    hasApiKey: Boolean(apiKey),
    model,
    modelIds,
    visionModel: providerKey === AI_PROVIDERS.siliconflow ? siliconFlowVisionModel : "",
    textModel: providerKey === AI_PROVIDERS.siliconflow ? siliconFlowTextModel : "",
    timeoutMs,
    configured: enabled && Boolean(apiKey) && Boolean(model) && (
      providerKey !== AI_PROVIDERS.siliconflow || Boolean(siliconFlowVisionModel && siliconFlowTextModel)
    ),
    ...uatMode
  };
}

function isProductionEnvironment(env = process.env) {
  return clean(env.NODE_ENV).toLowerCase() === "production";
}

function isTruthyFlag(value) {
  return ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());
}

function getSectionTemplateRecognitionUatMode(env = process.env) {
  const uatModeRequested = isTruthyFlag(firstCleanEnvValue(env.AI_SECTION_TEMPLATE_UAT_MODE, env.OPENAI_SECTION_TEMPLATE_UAT_MODE));
  const uatModeAvailable = !isProductionEnvironment(env);

  return {
    uatModeRequested,
    uatModeAvailable,
    uatModeEnabled: uatModeRequested && uatModeAvailable
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

function buildSiliconFlowVisionPayload({ model, dataUrl, fields }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You analyze website section screenshots for a page designer. Describe only the visible structure, copy, layout, visual hierarchy, cards, images, buttons, and interaction cues. Do not infer external links or reuse brand assets."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Analyze the screenshot as one website section.",
              "If multiple sections are visible, choose the visually dominant section.",
              `Locale: ${fields.locale || "en"}. Page key: ${fields.pageKey || "general"}. Industry: ${fields.industry || "custom"}.`,
              `Section type hint: ${fields.sectionTypeHint || "auto"}. Purpose hint: ${fields.purposeHint || "none"}.`,
              "Return a concise structured plain-text analysis. Do not output HTML, CSS, JavaScript, or JSON."
            ].join("\n")
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl
            }
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 1400
  };
}

function buildSiliconFlowTemplatePayload({ model, visionSummary, fields }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You create safe, reviewable page-designer section templates from screenshot analysis. Return only one valid JSON object. Do not include Markdown fences, HTML, CSS, or JavaScript."
      },
      {
        role: "user",
        content: [
          buildRecognitionPrompt(fields),
          "Screenshot analysis:",
          clean(visionSummary).slice(0, 6000),
          "Return only JSON matching this shape: {\"template\":{\"name\":\"\",\"description\":\"\",\"purpose\":\"\",\"tags\":[],\"section\":{}},\"recognition\":{\"confidence\":0.0,\"notes\":[],\"detectedSectionType\":\"\",\"riskFlags\":[\"manual_review_required\"]}}."
        ].join("\n\n")
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2400
  };
}

function createUatRows(type) {
  if (type === "trust_bar") {
    return [
      ["3", "Review states"],
      ["1", "Candidate section"],
      ["0", "External assets copied"],
      ["100%", "Local validation"]
    ];
  }
  if (type === "workflow_steps") {
    return [
      ["01", "Upload screenshot", "The screenshot was accepted by the local UAT path."],
      ["02", "Review candidate", "Check text, layout, style, and risk flags before saving."],
      ["03", "Insert canvas", "Insert only after the candidate passes product review."]
    ];
  }
  if (type === "faq_band") {
    return [
      ["Is this real AI output?", "No. This UAT candidate is generated locally to test the workflow."],
      ["Can it be saved?", "Yes, it uses the same template validation and save path as AI candidates."],
      ["Does it affect production?", "No. UAT mode is disabled when NODE_ENV is production."]
    ];
  }
  if (type === "updates_list") {
    return [
      ["UAT candidate generated", "Local mode returned one reviewable section.", "Pending review"],
      ["Template path ready", "Save, preview, insert, and archive can now be tested.", "Local only"]
    ];
  }
  if (type === "download_panel") {
    return [
      ["Review package", "Validate the generated section before saving."],
      ["Canvas insert", "Insert to the current draft without auto publishing."]
    ];
  }
  return [
    ["01", "Recognized heading", "Replace this placeholder with the screenshot headline."],
    ["02", "Recognized supporting copy", "Adjust this text in the content settings panel."],
    ["03", "Review styles", "Use approved style and layout tokens only."]
  ];
}

function createUatSection(type) {
  const normalizedType = SITE_SECTION_TYPES.includes(type) ? type : "hero";
  const variant = SECTION_VARIANTS[normalizedType]?.[0] || "simple";
  const baseSettings = {
    style: {
      textSize: "medium",
      cardStyle: "outlined",
      colorScheme: "neutral",
      imageRadius: "medium",
      cardSpacing: "normal"
    },
    layout: {
      desktopArrangement: normalizedType === "hero" || normalizedType === "media_feature" ? "split" : "stacked",
      mobileArrangement: "single-column",
      cardColumns: normalizedType === "support_entry" || normalizedType === "card_grid" || normalizedType === "capability_matrix" ? 3 : 1,
      contentAlign: "left",
      imagePosition: "right",
      entranceAnimation: "fade-up",
      hoverIn: "lift",
      hoverOut: "reset"
    }
  };

  if (normalizedType === "hero") {
    return {
      id: "ai-uat-hero",
      type: normalizedType,
      variant,
      settings: baseSettings,
      content: {
        eyebrow: "UAT recognition",
        title: "Review this locally generated candidate",
        lead: "This block tests upload, preview, save, insert, and settings flows without calling an external AI provider.",
        primaryCta: "Review settings",
        primaryHref: "",
        secondaryCta: "Keep editing",
        secondaryHref: "",
        heroImagePath: "",
        heroAlt: "Local UAT section recognition candidate"
      }
    };
  }

  if (normalizedType === "media_feature") {
    return {
      id: "ai-uat-media-feature",
      type: normalizedType,
      variant,
      settings: baseSettings,
      content: {
        eyebrow: "Local UAT",
        title: "Screenshot structure candidate",
        lead: "Use this placeholder to verify that content, style, and layout controls stay editable.",
        imagePath: "",
        imageAlt: "Local UAT screenshot placeholder",
        items: createUatRows(normalizedType)
      }
    };
  }

  if (normalizedType === "cta_band") {
    return {
      id: "ai-uat-cta",
      type: normalizedType,
      variant,
      settings: baseSettings,
      content: {
        eyebrow: "Local UAT",
        title: "Confirm the candidate before saving",
        lead: "This generated section is for workflow testing only.",
        primaryCta: "Insert canvas",
        primaryHref: "",
        secondaryCta: "Recognize again",
        secondaryHref: ""
      }
    };
  }

  return {
    id: `ai-uat-${normalizedType.replace(/_/g, "-")}`,
    type: normalizedType,
    variant,
    settings: baseSettings,
    content: {
      eyebrow: "Local UAT",
      title: "Screenshot recognition candidate",
      lead: "Generated locally to verify the AI template save and reuse workflow.",
      actionLabel: "Review",
      actionHref: "",
      primaryCta: "Insert canvas",
      primaryHref: "",
      items: createUatRows(normalizedType),
      ...(normalizedType === "trust_bar" ? { ariaLabel: "Local UAT recognition metrics" } : {})
    }
  };
}

function buildUatRecognitionResult(fields = {}) {
  const detectedType = SITE_SECTION_TYPES.includes(clean(fields.sectionTypeHint))
    ? clean(fields.sectionTypeHint)
    : "hero";

  return {
    template: {
      name: "Local UAT recognized section",
      description: "A deterministic local candidate for testing the screenshot recognition workflow.",
      purpose: fields.purposeHint || "uat_section_recognition",
      tags: ["uat", "ai", "screenshot"],
      section: createUatSection(detectedType)
    },
    recognition: {
      confidence: 0.62,
      notes: [
        "Local UAT mode generated this candidate without calling an external AI provider.",
        "Use this only to test upload, save, preview, insert, and archive flows.",
        "Production disables UAT mode even if the environment variable is set."
      ],
      detectedSectionType: detectedType,
      riskFlags: ["manual_review_required"]
    }
  };
}

function createUatRecognitionOutput(fields = {}, sourceImage = {}) {
  const output = normalizeRecognitionCandidate(buildUatRecognitionResult(fields), fields, sourceImage);
  output.recognition.mode = "uat";
  output.recognition.uatMode = true;
  output.recognition.model = UAT_RECOGNITION_MODEL;
  return output;
}

function parseJsonText(text) {
  const value = clean(text);
  if (!value) return null;
  const stripped = value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (error) {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw error;
  }
}

function extractChatCompletionText(responseJson) {
  const message = responseJson?.choices?.[0]?.message;
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function extractResponseJson(responseJson) {
  if (!responseJson || typeof responseJson !== "object") {
    throw recognitionError("invalid_recognition_response", "Recognition response is empty.");
  }

  if (typeof responseJson.output_text === "string") {
    return parseJsonText(responseJson.output_text);
  }

  const chatText = extractChatCompletionText(responseJson);
  if (chatText) {
    return parseJsonText(chatText);
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
  UAT_RECOGNITION_MODEL,
  buildOpenAIRecognitionPayload,
  buildRecognitionPrompt,
  buildRecognitionSchema,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createDataUrl,
  createUatRecognitionOutput,
  extractChatCompletionText,
  extractResponseJson,
  getSectionTemplateRecognitionSettings,
  getSectionTemplateRecognitionUatMode,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
};
