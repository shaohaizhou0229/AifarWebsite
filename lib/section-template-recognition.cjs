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
const aiLayoutRules = require("./ai-layout-section.cjs");

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
const {
  AI_LAYOUT_APPEARANCE_VARIANTS,
  AI_LAYOUT_ELEMENT_ROLES,
  AI_LAYOUT_ELEMENT_TYPES,
  AI_LAYOUT_FILLS,
  AI_LAYOUT_FITS,
  AI_LAYOUT_LINE_CLAMPS,
  AI_LAYOUT_PADDING,
  AI_LAYOUT_SECTION_TYPE,
  AI_LAYOUT_VARIANT,
  normalizeAiLayoutElements
} = aiLayoutRules;

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const RECOGNITION_UNAVAILABLE_CODE = "recognitionUnavailable";
const RECOGNITION_TIMEOUT_CODE = "recognition_timeout";
const DEFAULT_RECOGNITION_TIMEOUT_MS = 120000;
const DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS = 240000;
const MAX_RECOGNITION_TIMEOUT_MS = 300000;
const ALLOWED_SCREENSHOT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_SCREENSHOT_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const SUPPORTED_PAGE_KEYS = new Set(["home", "product"]);
const DEFAULT_MODEL = "gpt-5.5";
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
  const defaultTimeoutMs = providerKey === AI_PROVIDERS.siliconflow
    ? DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS
    : DEFAULT_RECOGNITION_TIMEOUT_MS;
  const timeoutMs = normalizeRecognitionTimeoutMs(firstCleanEnvValue(
    env.AI_SECTION_TEMPLATE_TIMEOUT_MS,
    providerKey === AI_PROVIDERS.siliconflow ? env.SILICONFLOW_TIMEOUT_MS : "",
    env.OPENAI_SECTION_TEMPLATE_TIMEOUT_MS
  ), defaultTimeoutMs);
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
      providerKey !== AI_PROVIDERS.siliconflow || Boolean(siliconFlowVisionModel)
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

function normalizeRecognitionTimeoutMs(value, defaultTimeoutMs = DEFAULT_RECOGNITION_TIMEOUT_MS) {
  const normalized = clean(value);
  if (!normalized) return defaultTimeoutMs;
  const timeoutMs = Number(normalized);
  if (!Number.isFinite(timeoutMs)) return defaultTimeoutMs;
  return Math.min(MAX_RECOGNITION_TIMEOUT_MS, Math.max(5000, Math.round(timeoutMs)));
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
  const sourceImage = fields.sourceImage || {};
  const sourceWidth = Number(sourceImage.width || 0);
  const sourceHeight = Number(sourceImage.height || 0);
  const sourceRatio = sourceWidth && sourceHeight ? Math.round((sourceWidth / sourceHeight) * 1000) / 1000 : 0;
  return [
    "You are converting one website section screenshot into a new safe Aifar page-designer AI layout section template.",
    `Return only one candidate section of type ${AI_LAYOUT_SECTION_TYPE} and variant ${AI_LAYOUT_VARIANT}. Do not pick an existing system template and do not generate code.`,
    "First identify the visible element map: text, buttons, images, cards, badges, and icons with their relative positions inside the screenshot container.",
    "Every element should include a semantic role when possible: eyebrow, headline, body, cta, media, card, or decorative.",
    "Every element must include type and normalized x, y, width, height values from 0 to 1. Coordinates must describe the element position relative to the uploaded screenshot, not absolute pixels.",
    "Do not return an empty elements array. When visible, include separate objects for the eyebrow/badge, headline, supporting paragraph, CTA button, and image or media placeholder.",
    "For centered hero screenshots, keep the eyebrow, headline, supporting paragraph, CTA button, and media slot centered on the same vertical axis.",
    "For pricing, plan comparison, or repeated-card screenshots, represent each pricing card as one card element with concise multiline text instead of expanding every checklist icon or feature row into separate elements.",
    "Do not apply pricing-card compression to simple hero screenshots. A single hero should still use separate eyebrow, headline, body, CTA, and media elements.",
    "Every section.content.elements item and recognition.detectedElements item must be a JSON object, never a string, sentence, markdown bullet, or array.",
    "Preserve readable screenshot text exactly, including line breaks collapsed into spaces. Button labels should match the screenshot, for example Try Demo or Contact support.",
    "Then convert that element map into section.content.canvas and section.content.elements. The layout must scale to the page designer canvas width and must not contain fixed page width, HTML, CSS, or JavaScript.",
    "Use safe appearance tokens to capture visual intent: plain small badges, solid rectangular CTAs, and solid/soft image placeholders when the screenshot shows colored media blocks.",
    "Return only one candidate section. If the screenshot contains multiple sections, choose the most visually dominant one and include manual_review_required.",
    "Use neutral placeholder copy when text is unclear. Do not reuse brand assets, copyrighted imagery, external URLs, HTML, CSS, or JavaScript.",
    "External links must be returned as empty strings or safe site-relative paths such as /contact/ or /downloads/.",
    "Images must be represented as image elements with empty imagePath/imageUrl, descriptive alt text, and image slot position. Do not copy the uploaded screenshot image into the generated section.",
    `Locale: ${fields.locale || "en"}. Page key: ${fields.pageKey || "general"}. Industry: ${fields.industry || "custom"}.`,
    sourceWidth && sourceHeight
      ? `Uploaded screenshot reference: sourceWidth ${sourceWidth}, sourceHeight ${sourceHeight}, aspectRatio ${sourceRatio}. Use this aspect ratio for content.canvas.`
      : "If the screenshot dimensions are visible from metadata, include sourceWidth, sourceHeight, and aspectRatio in content.canvas.",
    `Section type hint: ${fields.sectionTypeHint || "auto"} is only a semantic hint; the generated section should still be ${AI_LAYOUT_SECTION_TYPE}. Purpose hint: ${fields.purposeHint || "none"}.`,
    `Allowed AI layout element types: ${AI_LAYOUT_ELEMENT_TYPES.join(", ")}.`,
    `Allowed AI layout element roles: ${AI_LAYOUT_ELEMENT_ROLES.join(", ")}.`,
    `Allowed AI layout appearance variants: ${AI_LAYOUT_APPEARANCE_VARIANTS.join(", ")}. Allowed fills: ${AI_LAYOUT_FILLS.join(", ")}. Allowed padding: ${AI_LAYOUT_PADDING.join(", ")}. Allowed image fit: ${AI_LAYOUT_FITS.join(", ")}. Allowed lineClamp: ${AI_LAYOUT_LINE_CLAMPS.join(", ")}.`,
    `Allowed section types: ${SITE_SECTION_TYPES.join(", ")}.`,
    `Allowed variants by section type: ${JSON.stringify(SECTION_VARIANTS)}.`,
    `Allowed style tokens: ${JSON.stringify(STYLE_TOKENS)}.`,
    `Allowed layout tokens: ${JSON.stringify(LAYOUT_TOKENS)}.`,
    `Allowed risk flags: ${SECTION_TEMPLATE_RISK_FLAGS.join(", ")}.`,
    "The section object must contain id, type, variant, settings, and content. content must contain canvas and elements. recognition should include detectedElements and layoutSummary for human review.",
    `Example element object: {"id":"title-1","type":"text","role":"headline","text":"Take quick action that increases your brand's regular profit.","box":{"x":0.24,"y":0.12,"width":0.52,"height":0.12},"zIndex":2,"appearance":{"align":"center","tone":"default","textSize":"xl","weight":"800","variant":"plain"}}.`
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
          },
          layoutSummary: { type: "string" },
          detectedElements: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                type: { type: "string", enum: AI_LAYOUT_ELEMENT_TYPES },
                role: { type: "string", enum: AI_LAYOUT_ELEMENT_ROLES },
                text: { type: "string" },
                alt: { type: "string" },
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                appearance: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    textSize: { type: "string", enum: ["xs", "sm", "md", "lg", "xl"] },
                    weight: { type: "string", enum: ["400", "500", "600", "700", "800"] },
                    align: { type: "string", enum: ["left", "center", "right"] },
                    tone: { type: "string", enum: ["default", "muted", "brand", "purple", "inverted", "surface"] },
                    radius: { type: "string", enum: ["none", "small", "medium", "large"] },
                    variant: { type: "string", enum: AI_LAYOUT_APPEARANCE_VARIANTS },
                    fill: { type: "string", enum: AI_LAYOUT_FILLS },
                    padding: { type: "string", enum: AI_LAYOUT_PADDING },
                    fit: { type: "string", enum: AI_LAYOUT_FITS },
                    lineClamp: { type: "string", enum: AI_LAYOUT_LINE_CLAMPS }
                  }
                },
                box: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" }
                  }
                }
              }
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
          { type: "input_image", image_url: dataUrl, detail: "original" }
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
        content: "You analyze website section screenshots for a page designer. Extract the visible element map with relative positions. Do not infer external links or reuse brand assets."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Analyze the screenshot as one website section.",
              "If multiple sections are visible, choose the visually dominant section.",
              "List every important visible element as one line with type, readable text or alt description, and normalized box coordinates x, y, width, height from 0 to 1.",
              "Include the semantic role for each element when possible: eyebrow, headline, body, cta, media, card, or decorative.",
              "Do not skip small text if it is readable. Extract badge text, headline, paragraph text, CTA label, and image placeholder position when present.",
              "Write each detected item as ELEMENT_JSON followed by one compact JSON object. Do not write prose inside detected item objects.",
              `Allowed element types: ${AI_LAYOUT_ELEMENT_TYPES.join(", ")}.`,
              `Allowed roles: ${AI_LAYOUT_ELEMENT_ROLES.join(", ")}.`,
              "Preserve readable headline, body, badge, and button text exactly when possible.",
              "For image regions, describe the image slot and visual role but do not copy image assets.",
              "For centered hero screenshots, explicitly note whether the media slot is centered, left, or right aligned.",
              "Mention the overall layout direction, visual hierarchy, and screenshot aspect ratio if obvious.",
              `Locale: ${fields.locale || "en"}. Page key: ${fields.pageKey || "general"}. Industry: ${fields.industry || "custom"}.`,
              `Section type hint: ${fields.sectionTypeHint || "auto"}. Purpose hint: ${fields.purposeHint || "none"}.`,
              "Return concise structured plain text. Do not output HTML, CSS, JavaScript, or executable code."
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

function buildSiliconFlowDirectRecognitionPayload({ model, dataUrl, fields }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You convert one website section screenshot into one safe Aifar page-designer ai_layout JSON candidate. Return only valid JSON. Do not include Markdown fences, HTML, CSS, JavaScript, or external asset URLs."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              buildRecognitionPrompt(fields),
              "Keep the output compact. Prefer 4 to 12 important elements. For pricing screenshots, make one compact card element per visible plan and keep headline, tabs, and buttons as important elements. Preserve readable text and button labels. Use image placeholders for visual regions.",
              `Return only JSON matching this shape: {"template":{"name":"","description":"","purpose":"","tags":[],"section":{"id":"ai-layout","type":"${AI_LAYOUT_SECTION_TYPE}","variant":"${AI_LAYOUT_VARIANT}","settings":{},"content":{"canvas":{"aspectRatio":1.6,"sourceWidth":0,"sourceHeight":0,"background":"default","padding":"normal","maxWidth":"content","mobileMode":"scale"},"elements":[{"id":"","type":"text","role":"headline","text":"","box":{"x":0,"y":0,"width":0,"height":0},"appearance":{"align":"center","variant":"plain"}}]}}},"recognition":{"confidence":0.0,"notes":[],"detectedSectionType":"${AI_LAYOUT_SECTION_TYPE}","riskFlags":["manual_review_required"],"layoutSummary":"","detectedElements":[]}}.`
            ].join("\n\n")
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
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2800
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
          `Return only JSON matching this shape: {"template":{"name":"","description":"","purpose":"","tags":[],"section":{"id":"ai-layout","type":"${AI_LAYOUT_SECTION_TYPE}","variant":"${AI_LAYOUT_VARIANT}","settings":{},"content":{"canvas":{"aspectRatio":1.6,"sourceWidth":0,"sourceHeight":0,"background":"default","padding":"normal","maxWidth":"content","mobileMode":"scale"},"elements":[{"id":"","type":"text","role":"headline","text":"","box":{"x":0,"y":0,"width":0,"height":0},"appearance":{"align":"center","variant":"plain"}}]}}},"recognition":{"confidence":0.0,"notes":[],"detectedSectionType":"${AI_LAYOUT_SECTION_TYPE}","riskFlags":["manual_review_required"],"layoutSummary":"","detectedElements":[]}}.`
        ].join("\n\n")
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2800
  };
}

function buildJsonRepairPrompt({ rawText = "", parseError = {}, fields = {} }) {
  return [
    "Repair the following malformed AI section recognition JSON into one valid JSON object.",
    "Keep the same content intent, but remove malformed fragments, duplicate commas, unfinished array items, markdown, and prose outside JSON.",
    "If a long elements array is broken, keep the most important 4 to 12 safe elements. For pricing or repeated-card screenshots, prefer one card element per plan instead of every feature row.",
    "Do not invent HTML, CSS, JavaScript, external URLs, or more than one section.",
    `The repaired section must be type ${AI_LAYOUT_SECTION_TYPE} and variant ${AI_LAYOUT_VARIANT}.`,
    `Allowed AI layout element types: ${AI_LAYOUT_ELEMENT_TYPES.join(", ")}.`,
    `Allowed AI layout roles: ${AI_LAYOUT_ELEMENT_ROLES.join(", ")}.`,
    `Allowed appearance variants: ${AI_LAYOUT_APPEARANCE_VARIANTS.join(", ")}. Allowed fills: ${AI_LAYOUT_FILLS.join(", ")}.`,
    `Locale: ${fields.locale || "en"}. Page key: ${fields.pageKey || "general"}. Industry: ${fields.industry || "custom"}.`,
    `Parse error: ${clean(parseError.parseMessage || parseError.message).slice(0, 240) || "unknown"}.`,
    `Return only JSON matching this shape: {"template":{"name":"","description":"","purpose":"","tags":[],"section":{"id":"ai-layout","type":"${AI_LAYOUT_SECTION_TYPE}","variant":"${AI_LAYOUT_VARIANT}","settings":{},"content":{"canvas":{"aspectRatio":1.6,"sourceWidth":0,"sourceHeight":0,"background":"default","padding":"normal","maxWidth":"content","mobileMode":"scale"},"elements":[{"id":"","type":"text","role":"headline","text":"","box":{"x":0,"y":0,"width":0,"height":0},"appearance":{"align":"center","variant":"plain"}}]}}},"recognition":{"confidence":0.0,"notes":["JSON was repaired after malformed provider output."],"detectedSectionType":"${AI_LAYOUT_SECTION_TYPE}","riskFlags":["manual_review_required"],"layoutSummary":"","detectedElements":[]}}.`,
    "Malformed JSON:",
    clean(rawText).slice(0, 14000)
  ].join("\n\n");
}

function buildSiliconFlowJsonRepairPayload({ model, rawText, parseError, fields }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You repair malformed JSON for a safe page-designer ai_layout template. Return only one valid JSON object."
      },
      {
        role: "user",
        content: buildJsonRepairPrompt({ rawText, parseError, fields })
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 2800
  };
}

function buildOpenAIJsonRepairPayload({ model, rawText, parseError, fields }) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You repair malformed JSON for safe page-designer section templates. Return only JSON matching the provided schema."
          }
        ]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildJsonRepairPrompt({ rawText, parseError, fields }) }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "section_template_recognition_repair",
        strict: false,
        schema: buildRecognitionSchema()
      }
    },
    max_output_tokens: 2800
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

function createUatAiLayoutSection() {
  return {
    id: "ai-uat-layout",
    type: AI_LAYOUT_SECTION_TYPE,
    variant: AI_LAYOUT_VARIANT,
    settings: {
      style: {
        textSize: "medium",
        titleWeight: "700",
        buttonStyle: "solid",
        colorScheme: "neutral",
        imageRadius: "medium",
        cardStyle: "outlined"
      },
      layout: {
        contentAlign: "center",
        mobileArrangement: "single-column",
        entranceAnimation: "fade-up"
      }
    },
    content: {
      canvas: {
        aspectRatio: 1.62,
        background: "default",
        padding: "normal",
        maxWidth: "content",
        mobileMode: "scale",
        sourceWidth: 1440,
        sourceHeight: 890
      },
      elements: [
        {
          id: "badge-1",
          type: "badge",
          role: "eyebrow",
          text: "New feature",
          box: { x: 0.43, y: 0.09, width: 0.14, height: 0.05 },
          zIndex: 2,
          appearance: { align: "center", tone: "purple", textSize: "xs", weight: "700", radius: "none", variant: "plain", padding: "none" }
        },
        {
          id: "title-1",
          type: "text",
          role: "headline",
          text: "Review this generated AI layout",
          box: { x: 0.27, y: 0.17, width: 0.46, height: 0.12 },
          zIndex: 2,
          appearance: { align: "center", tone: "default", textSize: "xl", weight: "800", variant: "plain" }
        },
        {
          id: "lead-1",
          type: "text",
          role: "body",
          text: "This local candidate keeps text, button, image slot, and relative positions inside the safe page-designer canvas.",
          box: { x: 0.25, y: 0.31, width: 0.5, height: 0.08 },
          zIndex: 2,
          appearance: { align: "center", tone: "muted", textSize: "sm", weight: "500", variant: "plain" }
        },
        {
          id: "button-1",
          type: "button",
          role: "cta",
          text: "Try demo",
          href: "",
          box: { x: 0.45, y: 0.43, width: 0.1, height: 0.06 },
          zIndex: 2,
          appearance: { align: "center", tone: "inverted", textSize: "sm", weight: "700", radius: "small", variant: "solid", fill: "purple", padding: "xs" }
        },
        {
          id: "image-1",
          type: "image",
          role: "media",
          imagePath: "",
          imageUrl: "",
          alt: "Recognized screenshot image placeholder",
          box: { x: 0.21, y: 0.58, width: 0.58, height: 0.3 },
          zIndex: 1,
          appearance: { radius: "small", tone: "inverted", variant: "placeholder-solid", fill: "purple", fit: "contain" }
        }
      ]
    }
  };
}

function createUatSection(type) {
  const normalizedType = SITE_SECTION_TYPES.includes(type) ? type : "hero";
  if (normalizedType === AI_LAYOUT_SECTION_TYPE) {
    return createUatAiLayoutSection();
  }

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
  const detectedType = AI_LAYOUT_SECTION_TYPE;
  const section = createUatSection(detectedType);

  return {
    template: {
      name: "Local UAT AI layout section",
      description: "A deterministic local AI layout candidate for testing screenshot composition workflow.",
      purpose: fields.purposeHint || "uat_section_recognition",
      tags: ["uat", "ai", "screenshot", "layout"],
      section
    },
    recognition: {
      confidence: 0.62,
      notes: [
        "Local UAT mode generated this candidate without calling an external AI provider.",
        "Use this only to test upload, layout preview, save, insert, and archive flows.",
        "Production disables UAT mode even if the environment variable is set."
      ],
      detectedSectionType: detectedType,
      riskFlags: ["manual_review_required"],
      layoutSummary: "Centered hero composition with badge, title, lead, button, and lower image slot.",
      detectedElements: section.content.elements
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
      const snippet = stripped.slice(start, end + 1);
      try {
        return JSON.parse(snippet);
      } catch (snippetError) {
        const parseError = recognitionError(
          "invalid_recognition_json",
          "AI returned incomplete JSON. Please retry or use a clearer screenshot."
        );
        parseError.rawText = snippet.slice(0, 16000);
        parseError.parseMessage = snippetError.message || error.message || "";
        throw parseError;
      }
    }
    const parseError = recognitionError(
      "invalid_recognition_json",
      "AI returned incomplete JSON. Please retry or use a clearer screenshot."
    );
    parseError.rawText = stripped.slice(0, 16000);
    parseError.parseMessage = error.message || "";
    throw parseError;
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

function extractResponseText(responseJson) {
  if (!responseJson || typeof responseJson !== "object") {
    return "";
  }

  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const chatText = extractChatCompletionText(responseJson);
  if (chatText) {
    return chatText;
  }

  const stack = Array.isArray(responseJson.output) ? [...responseJson.output] : [];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;
    if (typeof current.text === "string") {
      return current.text;
    }
    if (typeof current.content === "string") {
      return current.content;
    }
    if (Array.isArray(current.content)) {
      stack.unshift(...current.content);
    }
    if (Array.isArray(current.output)) {
      stack.unshift(...current.output);
    }
  }

  return "";
}

function extractResponseJson(responseJson) {
  if (!responseJson || typeof responseJson !== "object") {
    throw recognitionError("invalid_recognition_response", "Recognition response is empty.");
  }

  const text = extractResponseText(responseJson);
  if (text) return parseJsonText(text);

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

function normalizeRecognizedSettingsShape(section) {
  if (!section || typeof section !== "object" || !section.settings || typeof section.settings !== "object" || Array.isArray(section.settings)) {
    return section;
  }

  const settings = { ...section.settings };
  const style = {};
  const layout = {};

  if (settings.style && typeof settings.style === "object" && !Array.isArray(settings.style)) {
    for (const [key, value] of Object.entries(settings.style)) {
      if (Object.prototype.hasOwnProperty.call(STYLE_TOKENS, key)) {
        const nextValue = typeof value === "number" ? value : clean(value);
        if (STYLE_TOKENS[key].includes(nextValue)) style[key] = nextValue;
      } else {
        style[key] = value;
      }
    }
  }

  if (settings.layout && typeof settings.layout === "object" && !Array.isArray(settings.layout)) {
    for (const [key, value] of Object.entries(settings.layout)) {
      if (Object.prototype.hasOwnProperty.call(LAYOUT_TOKENS, key)) {
        const nextValue = typeof value === "number" ? value : clean(value);
        if (LAYOUT_TOKENS[key].includes(nextValue)) layout[key] = nextValue;
      } else {
        layout[key] = value;
      }
    }
  }

  for (const key of Object.keys(settings)) {
    if (Object.prototype.hasOwnProperty.call(STYLE_TOKENS, key)) {
      const nextValue = typeof settings[key] === "number" ? settings[key] : clean(settings[key]);
      if (style[key] === undefined && STYLE_TOKENS[key].includes(nextValue)) style[key] = nextValue;
      delete settings[key];
    } else if (Object.prototype.hasOwnProperty.call(LAYOUT_TOKENS, key)) {
      const nextValue = typeof settings[key] === "number" ? settings[key] : clean(settings[key]);
      if (layout[key] === undefined && LAYOUT_TOKENS[key].includes(nextValue)) layout[key] = nextValue;
      delete settings[key];
    }
  }

  if (Object.keys(style).length) settings.style = style;
  if (Object.keys(layout).length) settings.layout = layout;

  return {
    ...section,
    settings
  };
}

function firstCleanText(values = []) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function isGenericRecognitionTitle(value) {
  const text = clean(value).toLowerCase();
  return !text || ["ai recognized section", "ai layout", "recognized section"].includes(text);
}

function inferFallbackButtonText(context = {}) {
  const content = context.content || {};
  const direct = firstCleanText([
    content.primaryCta,
    content.secondaryCta,
    content.actionLabel,
    content.buttonText,
    content.cta
  ]);
  if (direct) return direct;

  const combined = clean([
    context.templateName,
    context.templateDescription,
    context.templatePurpose,
    ...(Array.isArray(context.templateTags) ? context.templateTags : [])
  ].filter(Boolean).join(" ")).toLowerCase();
  if (combined.includes("demo")) return "Try Demo";
  if (combined.includes("contact")) return "Contact";
  if (combined.includes("download")) return "Download";
  if (combined.includes("learn")) return "Learn more";
  return "Primary action";
}

function createFallbackAiLayoutElements(section = {}, context = {}) {
  const content = section.content && typeof section.content === "object" && !Array.isArray(section.content)
    ? section.content
    : {};
  const templateName = isGenericRecognitionTitle(context.templateName) ? "" : clean(context.templateName);
  const title = firstCleanText([content.title, content.headline, content.heading, templateName]) || "AI recognized section";
  const lead = firstCleanText([
    content.lead,
    content.description,
    content.subtitle,
    context.templateDescription
  ]) || "Review and refine this generated layout against the uploaded screenshot.";
  const badge = firstCleanText([content.eyebrow, content.badge, content.kicker]);
  const buttonText = inferFallbackButtonText({ ...context, content });
  const imageAlt = firstCleanText([
    content.heroAlt,
    content.imageAlt,
    content.alt,
    "Recognized screenshot image placeholder"
  ]);

  return [
    {
      id: "badge-1",
      type: "badge",
      role: "eyebrow",
      text: badge || "Screenshot",
      box: { x: 0.43, y: 0.08, width: 0.14, height: 0.05 },
      zIndex: 2,
      appearance: { align: "center", tone: "purple", textSize: "xs", weight: "700", radius: "none", variant: "plain", padding: "none" }
    },
    {
      id: "title-1",
      type: "text",
      role: "headline",
      text: title,
      box: { x: 0.23, y: 0.15, width: 0.54, height: 0.14 },
      zIndex: 2,
      appearance: { align: "center", tone: "default", textSize: "xl", weight: "800", variant: "plain" }
    },
    {
      id: "lead-1",
      type: "text",
      role: "body",
      text: lead,
      box: { x: 0.24, y: 0.31, width: 0.52, height: 0.09 },
      zIndex: 2,
      appearance: { align: "center", tone: "muted", textSize: "sm", weight: "500", variant: "plain" }
    },
    {
      id: "button-1",
      type: "button",
      role: "cta",
      text: buttonText,
      href: content.primaryHref || content.actionHref || "",
      box: { x: 0.44, y: 0.43, width: 0.12, height: 0.06 },
      zIndex: 2,
      appearance: { align: "center", tone: "inverted", textSize: "sm", weight: "700", radius: "small", variant: "solid", fill: "purple", padding: "xs" }
    },
    {
      id: "image-1",
      type: "image",
      role: "media",
      imagePath: "",
      imageUrl: "",
      alt: imageAlt,
      box: { x: 0.18, y: 0.58, width: 0.64, height: 0.32 },
      zIndex: 1,
      appearance: { tone: "inverted", radius: "small", variant: "placeholder-solid", fill: "purple", fit: "contain" }
    }
  ];
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function filterRecognizedAiLayoutElements(value = []) {
  return (Array.isArray(value) ? value : []).filter((element) => isPlainObject(element));
}

function clampRatio(value, fallback, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function getElementBox(element = {}) {
  const box = isPlainObject(element.box) ? element.box : {};
  return {
    x: clampRatio(box.x ?? element.x, 0.08, 0, 0.98),
    y: clampRatio(box.y ?? element.y, 0.08, 0, 0.98),
    width: clampRatio(box.width ?? box.w ?? element.width ?? element.w, 0.36, 0.02, 1),
    height: clampRatio(box.height ?? box.h ?? element.height ?? element.h, 0.1, 0.02, 1)
  };
}

function clampBox(box = {}) {
  const x = clampRatio(box.x, 0.08, 0, 0.98);
  const y = clampRatio(box.y, 0.08, 0, 0.98);
  let width = clampRatio(box.width, 0.36, 0.02, 1);
  let height = clampRatio(box.height, 0.1, 0.02, 1);
  if (x + width > 1) width = Math.max(0.02, 1 - x);
  if (y + height > 1) height = Math.max(0.02, 1 - y);
  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000
  };
}

function centeredBox(width, y, height) {
  const safeWidth = clampRatio(width, 0.5, 0.02, 1);
  return clampBox({
    x: (1 - safeWidth) / 2,
    y,
    width: safeWidth,
    height
  });
}

function inferAiLayoutRole(element = {}, index = 0, elements = []) {
  const explicit = clean(element.role);
  if (AI_LAYOUT_ELEMENT_ROLES.includes(explicit)) return explicit;
  const type = clean(element.type || element.kind);
  if (type === "badge") return "eyebrow";
  if (type === "button") return "cta";
  if (type === "image") return "media";
  if (type === "card") return "card";
  if (type === "icon") return "decorative";

  const textElements = elements.filter((item) => clean(item?.type || item?.kind) === "text");
  const firstText = textElements[0];
  const text = clean(element.text || element.label || element.title);
  const weight = Number(element.appearance?.weight || 0);
  if (element === firstText || weight >= 700 || (index <= 2 && text.length <= 120)) return "headline";
  return "body";
}

function textLineHeightForRole(role) {
  if (role === "headline") return 0.055;
  if (role === "body") return 0.035;
  return 0.028;
}

function minTextHeight(element = {}, role = "") {
  const text = clean(element.text || element.label || element.title);
  if (!text) return 0.04;
  const box = getElementBox(element);
  const charactersPerLine = Math.max(18, Math.round((box.width || 0.5) * 95));
  const lines = Math.min(4, Math.max(1, Math.ceil(text.length / charactersPerLine)));
  return Math.min(0.22, Math.max(box.height || 0, lines * textLineHeightForRole(role)));
}

function appearanceDefaultsForElement(element = {}, role = "") {
  const type = clean(element.type || element.kind);
  if (role === "eyebrow" || type === "badge") {
    return { align: "center", tone: "purple", textSize: "xs", weight: "700", radius: "none", variant: "plain", padding: "none" };
  }
  if (role === "headline") {
    return { align: "center", tone: "default", textSize: "xl", weight: "800", variant: "plain", lineClamp: "none" };
  }
  if (role === "body") {
    return { align: "center", tone: "muted", textSize: "sm", weight: "400", variant: "plain", lineClamp: "none" };
  }
  if (role === "cta" || type === "button") {
    return { align: "center", tone: "inverted", textSize: "xs", weight: "700", radius: "small", variant: "solid", fill: "purple", padding: "xs" };
  }
  if (role === "media" || type === "image") {
    return { tone: "inverted", radius: "small", variant: "placeholder-solid", fill: "purple", fit: "contain" };
  }
  if (role === "card" || type === "card") {
    return { align: "left", tone: "default", radius: "medium", variant: "soft", fill: "surface", padding: "sm" };
  }
  return { variant: "plain" };
}

function enrichAiLayoutElement(element = {}, index = 0, elements = []) {
  const role = inferAiLayoutRole(element, index, elements);
  const box = getElementBox(element);
  const nextBox = ["text", "badge"].includes(clean(element.type || element.kind))
    ? { ...box, height: minTextHeight(element, role) }
    : box;
  return {
    ...element,
    role,
    box: clampBox(nextBox),
    appearance: {
      ...appearanceDefaultsForElement(element, role),
      ...(isPlainObject(element.appearance) ? element.appearance : {})
    }
  };
}

function isCenteredHeroComposition(elements = []) {
  const textStack = elements.filter((element) => ["eyebrow", "headline", "body", "cta"].includes(element.role));
  const media = elements.find((element) => element.role === "media" || element.type === "image");
  if (!media || textStack.length < 3) return false;
  const earlyStack = textStack.filter((element) => getElementBox(element).y < 0.48);
  if (earlyStack.length < 3) return false;
  return earlyStack.every((element) => {
    const box = getElementBox(element);
    const center = box.x + box.width / 2;
    return Math.abs(center - 0.5) <= 0.22;
  });
}

function stabilizeCenteredHeroLayout(elements = []) {
  if (!isCenteredHeroComposition(elements)) return elements;

  const body = elements.find((element) => element.role === "body");
  const cta = elements.find((element) => element.role === "cta");
  const media = elements.find((element) => element.role === "media" || element.type === "image");
  const bodyBox = body ? getElementBox(body) : null;
  const ctaBox = cta ? getElementBox(cta) : null;

  return elements.map((element) => {
    const box = getElementBox(element);
    if (element.role === "eyebrow") {
      const width = Math.min(0.18, Math.max(box.width, 0.08));
      return { ...element, box: centeredBox(width, box.y, Math.max(box.height, 0.025)) };
    }
    if (element.role === "headline") {
      const width = Math.min(0.68, Math.max(box.width, 0.48));
      return { ...element, box: centeredBox(width, box.y, Math.max(box.height, minTextHeight(element, "headline"))) };
    }
    if (element.role === "body") {
      const width = Math.min(0.62, Math.max(box.width, 0.42));
      return { ...element, box: centeredBox(width, box.y, Math.max(box.height, minTextHeight(element, "body"))) };
    }
    if (element.role === "cta") {
      const width = Math.min(0.18, Math.max(box.width, 0.09));
      const y = bodyBox ? Math.max(box.y, bodyBox.y + bodyBox.height + 0.025) : box.y;
      return { ...element, box: centeredBox(width, y, Math.max(box.height, 0.045)) };
    }
    if (element === media) {
      const desiredWidth = Math.min(0.68, Math.max(box.width, 0.58));
      const minY = ctaBox ? ctaBox.y + ctaBox.height + 0.1 : 0.5;
      const y = Math.max(box.y, minY, 0.5);
      const desiredHeight = Math.min(0.38, Math.max(box.height, 0.3));
      return { ...element, box: centeredBox(desiredWidth, y, desiredHeight) };
    }
    return element;
  });
}

function sourceCanvasDefaults(sourceImage = {}) {
  const sourceWidth = Number(sourceImage.width || sourceImage.sourceWidth || 0);
  const sourceHeight = Number(sourceImage.height || sourceImage.sourceHeight || 0);
  if (!sourceWidth || !sourceHeight) return {};
  return {
    sourceWidth,
    sourceHeight,
    aspectRatio: Math.round((sourceWidth / sourceHeight) * 10000) / 10000
  };
}

function normalizeRecognizedAiLayoutCanvas(canvas = {}, sourceImage = {}) {
  const sourceDefaults = sourceCanvasDefaults(sourceImage);
  return {
    ...canvas,
    ...sourceDefaults,
    aspectRatio: canvas.aspectRatio || canvas.ratio || sourceDefaults.aspectRatio || 1.6,
    background: canvas.background || "default",
    padding: canvas.padding || "normal",
    maxWidth: canvas.maxWidth || "content",
    mobileMode: canvas.mobileMode || "scale"
  };
}

function createFallbackContext(recognition = {}) {
  return {
    templateName: recognition.templateName,
    templateDescription: recognition.templateDescription,
    templatePurpose: recognition.templatePurpose,
    templateTags: recognition.templateTags
  };
}

function sanitizeRecognizedAiLayoutSection(section = {}, recognition = {}, sourceImage = {}) {
  const content = isPlainObject(section.content) ? section.content : {};
  const candidateElements = filterRecognizedAiLayoutElements(content.elements);
  const detectedElements = filterRecognizedAiLayoutElements(recognition.detectedElements);
  const rawElements = candidateElements.length
    ? candidateElements
    : detectedElements.length
      ? detectedElements
      : createFallbackAiLayoutElements(section, createFallbackContext(recognition));
  const elements = stabilizeCenteredHeroLayout(
    rawElements.map((element, index) => enrichAiLayoutElement(element, index, rawElements))
  );

  return {
    ...section,
    content: {
      ...content,
      canvas: normalizeRecognizedAiLayoutCanvas(isPlainObject(content.canvas) ? content.canvas : {}, sourceImage),
      elements
    }
  };
}

function coerceRecognizedAiLayoutSection(section = {}, recognition = {}, sourceImage = {}) {
  if (!section || typeof section !== "object" || Array.isArray(section) || Array.isArray(section.sections)) {
    return section;
  }

  const type = clean(section.type);
  if (type && !SITE_SECTION_TYPES.includes(type)) return section;
  if (type === AI_LAYOUT_SECTION_TYPE) return sanitizeRecognizedAiLayoutSection(section, recognition, sourceImage);
  const sourceSettings = section.settings && typeof section.settings === "object" && !Array.isArray(section.settings)
    ? section.settings
    : {};
  const sourceStyle = { ...(sourceSettings.style || {}) };
  const sourceLayout = { ...(sourceSettings.layout || {}) };

  for (const [key, value] of Object.entries(sourceSettings)) {
    if (Object.prototype.hasOwnProperty.call(STYLE_TOKENS, key)) sourceStyle[key] = value;
    if (Object.prototype.hasOwnProperty.call(LAYOUT_TOKENS, key)) sourceLayout[key] = value;
  }

  const detectedElements = filterRecognizedAiLayoutElements(recognition.detectedElements);

  return {
    id: clean(section.id) || "ai-layout",
    type: AI_LAYOUT_SECTION_TYPE,
    variant: AI_LAYOUT_VARIANT,
    settings: {
      ...sourceSettings,
      style: {
        textSize: "medium",
        titleWeight: "700",
        buttonStyle: "solid",
        colorScheme: "neutral",
        imageRadius: "medium",
        ...sourceStyle
      },
      layout: {
        contentAlign: "center",
        mobileArrangement: "single-column",
        entranceAnimation: "fade-up",
        ...sourceLayout
      }
    },
    content: {
      canvas: normalizeRecognizedAiLayoutCanvas({}, sourceImage),
      elements: stabilizeCenteredHeroLayout(
        (detectedElements.length
          ? detectedElements
          : createFallbackAiLayoutElements(section, createFallbackContext(recognition))
        ).map((element, index, sourceElements) => enrichAiLayoutElement(element, index, sourceElements))
      )
    }
  };
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
  const recognitionContext = {
    ...(result.recognition || {}),
    templateName: result.template.name,
    templateDescription: result.template.description,
    templatePurpose: result.template.purpose,
    templateTags: result.template.tags
  };
  const section = normalizeRecognizedSettingsShape(sanitizeExternalLinks(
    coerceRecognizedAiLayoutSection(result.template.section, recognitionContext, sourceImage),
    linkState
  ));
  const confidence = normalizeConfidence(result.recognition.confidence);
  const riskFlags = new Set([
    "manual_review_required",
    ...uniqueList(result.recognition.riskFlags, 12)
  ]);

  if (confidence < 0.7) riskFlags.add("low_confidence");
  if (linkState.removed) riskFlags.add("external_links_removed");
  const recognizedElements = filterRecognizedAiLayoutElements(result.recognition.detectedElements);
  const normalizedSectionElements = filterRecognizedAiLayoutElements(section.content?.elements);
  const detectedElements = normalizeAiLayoutElements(
    normalizedSectionElements.length
      ? normalizedSectionElements
      : recognizedElements
  );

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
      detectedSectionType: normalized.content.sections[0]?.type || AI_LAYOUT_SECTION_TYPE,
      layoutSummary: clean(result.recognition.layoutSummary).slice(0, 240),
      detectedElements,
      sourceImage
    }
  };
}

function readPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (offset + 3 >= buffer.length) return null;
    const length = buffer.readUInt16BE(offset + 2);
    if (!length || offset + length + 2 > buffer.length) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += length + 2;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }
  return null;
}

function getImageDimensionsFromBuffer(buffer) {
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  const dimensions = readPngDimensions(source) || readJpegDimensions(source) || readWebpDimensions(source);
  const width = Number(dimensions?.width || 0);
  const height = Number(dimensions?.height || 0);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000) {
    return {};
  }
  return { width, height };
}

function getImageDimensionsFromDataUrl(dataUrl = "") {
  const value = clean(dataUrl);
  const marker = ";base64,";
  const index = value.indexOf(marker);
  if (index < 0) return {};
  try {
    return getImageDimensionsFromBuffer(Buffer.from(value.slice(index + marker.length), "base64"));
  } catch {
    return {};
  }
}

function createDataUrl(buffer, mimeType) {
  return `data:${clean(mimeType) || "image/png"};base64,${Buffer.from(buffer).toString("base64")}`;
}

module.exports = {
  ALLOWED_SCREENSHOT_EXTENSIONS,
  ALLOWED_SCREENSHOT_MIME_TYPES,
  DEFAULT_MODEL,
  DEFAULT_RECOGNITION_TIMEOUT_MS,
  DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS,
  MAX_SCREENSHOT_SIZE,
  RECOGNITION_TIMEOUT_CODE,
  RECOGNITION_UNAVAILABLE_CODE,
  SUPPORTED_PAGE_KEYS,
  UAT_RECOGNITION_MODEL,
  buildOpenAIRecognitionPayload,
  buildOpenAIJsonRepairPayload,
  buildRecognitionPrompt,
  buildRecognitionSchema,
  buildSiliconFlowDirectRecognitionPayload,
  buildSiliconFlowJsonRepairPayload,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createDataUrl,
  createUatRecognitionOutput,
  extractChatCompletionText,
  extractResponseText,
  extractResponseJson,
  getImageDimensionsFromBuffer,
  getImageDimensionsFromDataUrl,
  getSectionTemplateRecognitionSettings,
  getSectionTemplateRecognitionUatMode,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
};
