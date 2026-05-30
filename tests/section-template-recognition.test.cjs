const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_RECOGNITION_TIMEOUT_MS,
  DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS,
  MAX_SCREENSHOT_SIZE,
  buildOpenAIRecognitionPayload,
  buildSiliconFlowDirectRecognitionPayload,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createUatRecognitionOutput,
  createDataUrl,
  extractChatCompletionText,
  extractResponseJson,
  getSectionTemplateRecognitionSettings,
  getSectionTemplateRecognitionUatMode,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
} = require("../lib/section-template-recognition.cjs");

function createFile(overrides = {}) {
  return {
    name: "section.png",
    type: "image/png",
    size: 1024,
    ...overrides
  };
}

function createRecognitionResult(overrides = {}) {
  return {
    template: {
      name: "Recognized service hero",
      description: "A recognized candidate block.",
      purpose: "service_entry",
      tags: ["hero", "service"],
      section: {
        id: "ai-hero",
        type: "hero",
        variant: "split",
        settings: {
          style: { textSize: "large", cardStyle: "outlined" },
          layout: { desktopArrangement: "split", mobileArrangement: "image-top" }
        },
        content: {
          eyebrow: "Service",
          title: "Start from one entry",
          lead: "Choose the right path.",
          primaryCta: "Start",
          primaryHref: "/contact/",
          heroImagePath: "",
          heroAlt: "Service portal screenshot"
        }
      },
      ...(overrides.template || {})
    },
    recognition: {
      confidence: 0.86,
      notes: ["One primary section detected."],
      detectedSectionType: "hero",
      riskFlags: ["manual_review_required"],
      ...(overrides.recognition || {})
    }
  };
}

test("screenshot validation accepts supported image types under 5 MB", () => {
  assert.equal(validateScreenshotFileInput(createFile()).ok, true);
  assert.equal(validateScreenshotFileInput(createFile({ name: "section.jpg", type: "" })).ok, true);
});

test("screenshot validation rejects missing unsupported empty and oversized files", () => {
  assert.equal(validateScreenshotFileInput(null).code, "screenshot_required");
  assert.equal(validateScreenshotFileInput(createFile({ size: 0 })).code, "screenshot_empty");
  assert.equal(validateScreenshotFileInput(createFile({ size: MAX_SCREENSHOT_SIZE + 1 })).code, "screenshot_too_large");
  assert.equal(validateScreenshotFileInput(createFile({ name: "section.gif", type: "image/gif" })).code, "screenshot_type");
});

test("recognition settings report unavailable when disabled or missing api key", () => {
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "false", OPENAI_API_KEY: "sk-test" }).configured, false);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "" }).configured, false);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "sk-test", OPENAI_SECTION_TEMPLATE_MODEL: "" }).configured, false);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "\"\"", OPENAI_SECTION_TEMPLATE_MODEL: "\"\"" }).configured, false);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "sk-test", OPENAI_SECTION_TEMPLATE_MODEL: "gpt-4.1-mini" }).configured, true);
});

test("recognition settings support SiliconFlow vision and text models", () => {
  const settings = getSectionTemplateRecognitionSettings({
    AI_SECTION_TEMPLATE_PROVIDER: "siliconflow",
    SILICONFLOW_API_KEY: "sf-test-secret",
    SILICONFLOW_BASE_URL: "https://api.siliconflow.cn/v1/",
    SILICONFLOW_VISION_MODEL: "Qwen/Qwen2.5-VL-72B-Instruct",
    SILICONFLOW_TEXT_MODEL: "Qwen/Qwen3-32B",
    SILICONFLOW_TIMEOUT_MS: "60000"
  });

  assert.equal(settings.providerKey, "siliconflow");
  assert.equal(settings.provider, "SiliconFlow");
  assert.equal(settings.baseUrl, "https://api.siliconflow.cn/v1");
  assert.equal(settings.configured, true);
  assert.equal(settings.visionModel, "Qwen/Qwen2.5-VL-72B-Instruct");
  assert.equal(settings.textModel, "Qwen/Qwen3-32B");
  assert.deepEqual(settings.modelIds, ["Qwen/Qwen2.5-VL-72B-Instruct", "Qwen/Qwen3-32B"]);
  assert.equal(settings.timeoutMs, 60000);
});

test("SiliconFlow recognition can be configured with a vision model only", () => {
  const settings = getSectionTemplateRecognitionSettings({
    AI_SECTION_TEMPLATE_PROVIDER: "siliconflow",
    SILICONFLOW_API_KEY: "sf-test-secret",
    SILICONFLOW_VISION_MODEL: "Qwen/Qwen3-VL-8B-Instruct",
    SILICONFLOW_TEXT_MODEL: ""
  });

  assert.equal(settings.configured, true);
  assert.equal(settings.visionModel, "Qwen/Qwen3-VL-8B-Instruct");
});

test("recognition settings clamp external API timeout", () => {
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "" }).timeoutMs, DEFAULT_RECOGNITION_TIMEOUT_MS);
  assert.equal(getSectionTemplateRecognitionSettings({ AI_SECTION_TEMPLATE_PROVIDER: "siliconflow" }).timeoutMs, DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "1" }).timeoutMs, 5000);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "999999" }).timeoutMs, 300000);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "32000" }).timeoutMs, 32000);
});

test("recognition UAT mode is local only and does not make real config configured", () => {
  assert.deepEqual(
    getSectionTemplateRecognitionUatMode({ OPENAI_SECTION_TEMPLATE_UAT_MODE: "true", NODE_ENV: "development" }),
    { uatModeRequested: true, uatModeAvailable: true, uatModeEnabled: true }
  );
  assert.deepEqual(
    getSectionTemplateRecognitionUatMode({ OPENAI_SECTION_TEMPLATE_UAT_MODE: "true", NODE_ENV: "production" }),
    { uatModeRequested: true, uatModeAvailable: false, uatModeEnabled: false }
  );

  const settings = getSectionTemplateRecognitionSettings({
    OPENAI_SECTION_TEMPLATE_ENABLED: "true",
    OPENAI_SECTION_TEMPLATE_UAT_MODE: "true",
    NODE_ENV: "development"
  });

  assert.equal(settings.configured, false);
  assert.equal(settings.uatModeEnabled, true);
});

test("recognition request fields stay inside existing page industry and section whitelists", () => {
  assert.deepEqual(
    normalizeRecognitionRequestFields({
      locale: "zh-CN",
      pageKey: "home",
      industry: "marketing",
      sectionTypeHint: "cta_band",
      purposeHint: "x".repeat(120)
    }),
    {
      locale: "zh-CN",
      pageKey: "home",
      industry: "marketing",
      sectionTypeHint: "cta_band",
      purposeHint: "x".repeat(80)
    }
  );
  assert.equal(normalizeRecognitionRequestFields({ pageKey: "support", industry: "unknown", sectionTypeHint: "free_html" }).pageKey, "");
  assert.equal(normalizeRecognitionRequestFields({ pageKey: "support", industry: "unknown", sectionTypeHint: "free_html" }).industry, "custom");
  assert.equal(normalizeRecognitionRequestFields({ pageKey: "support", industry: "unknown", sectionTypeHint: "free_html" }).sectionTypeHint, "auto");
});

test("OpenAI recognition payload uses Responses image input and structured JSON schema", () => {
  const payload = buildOpenAIRecognitionPayload({
    model: "gpt-4.1-mini",
    dataUrl: "data:image/png;base64,AAAA",
    fields: normalizeRecognitionRequestFields({ locale: "en" })
  });

  assert.equal(payload.model, "gpt-4.1-mini");
  assert.equal(payload.input[1].content[1].type, "input_image");
  assert.equal(payload.input[1].content[1].detail, "high");
  assert.equal(payload.text.format.type, "json_schema");
  assert.match(payload.input[1].content[0].text, /normalized x, y, width, height/);
  assert.match(payload.input[1].content[0].text, /ai_layout/);
});

test("SiliconFlow recognition payloads use vision first and JSON text conversion second", () => {
  const fields = normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" });
  const visionPayload = buildSiliconFlowVisionPayload({
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    dataUrl: "data:image/png;base64,AAAA",
    fields
  });
  const templatePayload = buildSiliconFlowTemplatePayload({
    model: "Qwen/Qwen3-32B",
    visionSummary: "A split hero with title, lead, and two buttons.",
    fields
  });

  assert.equal(visionPayload.model, "Qwen/Qwen2.5-VL-72B-Instruct");
  assert.equal(visionPayload.messages[1].content[1].type, "image_url");
  assert.equal(templatePayload.model, "Qwen/Qwen3-32B");
  assert.equal(templatePayload.response_format.type, "json_object");
  assert.match(templatePayload.messages[1].content, /Allowed section types/);
  assert.match(visionPayload.messages[1].content[0].text, /normalized box coordinates/);
  assert.match(templatePayload.messages[1].content, /screenshot_composition/);
});

test("SiliconFlow direct recognition payload can create ai layout from one vision call", () => {
  const payload = buildSiliconFlowDirectRecognitionPayload({
    model: "Qwen/Qwen3-VL-8B-Instruct",
    dataUrl: "data:image/webp;base64,AAA",
    fields: normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" })
  });

  assert.equal(payload.model, "Qwen/Qwen3-VL-8B-Instruct");
  assert.equal(payload.response_format.type, "json_object");
  assert.match(payload.messages[1].content[0].text, /ai_layout/);
  assert.equal(payload.messages[1].content[1].image_url.url, "data:image/webp;base64,AAA");
});

test("response JSON extraction supports output_text and nested Responses content", () => {
  assert.deepEqual(extractResponseJson({ output_text: "{\"ok\":true}" }), { ok: true });
  assert.deepEqual(
    extractResponseJson({ output: [{ content: [{ type: "output_text", text: "{\"ok\":true}" }] }] }),
    { ok: true }
  );
  assert.equal(
    extractChatCompletionText({ choices: [{ message: { content: "hello" } }] }),
    "hello"
  );
  assert.deepEqual(
    extractResponseJson({ choices: [{ message: { content: "Here is JSON: {\"ok\":true}" } }] }),
    { ok: true }
  );
});

test("legal AI result becomes pending review candidate with manual risk flag", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult(),
    normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home", industry: "public_service" }),
    { filename: "section.png", mimeType: "image/png", size: 1024 }
  );

  assert.equal(output.candidate.source, "ai");
  assert.equal(output.candidate.status, "pending_review");
  assert.equal(output.candidate.industry, "public_service");
  assert.equal(output.candidate.pageKey, "home");
  assert.equal(output.candidate.content.sections.length, 1);
  assert.equal(output.candidate.content.sections[0].type, "ai_layout");
  assert.equal(output.candidate.content.sections[0].variant, "screenshot_composition");
  assert.ok(output.candidate.content.sections[0].content.elements.length >= 1);
  assert.ok(output.candidate.riskFlags.includes("manual_review_required"));
  assert.equal(output.recognition.sourceImage.filename, "section.png");
});

test("recognized settings move allowlisted flat tokens into style and layout groups", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        section: {
          ...createRecognitionResult().template.section,
          settings: {
            textSize: "large",
            cardColumns: 2,
            style: { cardStyle: "outlined" }
          }
        }
      }
    }),
    normalizeRecognitionRequestFields(),
    {}
  );

  assert.equal(output.candidate.content.sections[0].settings.style.textSize, "large");
  assert.equal(output.candidate.content.sections[0].settings.style.cardStyle, "outlined");
  assert.equal(output.candidate.content.sections[0].settings.layout.cardColumns, 2);
});

test("recognized settings drop invalid known token values before strict validation", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        section: {
          ...createRecognitionResult().template.section,
          settings: {
            style: { textSize: "large" },
            layout: { imagePosition: "bottom", contentAlign: "center" }
          }
        }
      }
    }),
    normalizeRecognitionRequestFields(),
    {}
  );

  assert.equal(output.candidate.content.sections[0].settings.style.textSize, "large");
  assert.equal(output.candidate.content.sections[0].settings.layout.imagePosition, undefined);
  assert.equal(output.candidate.content.sections[0].settings.layout.contentAlign, "center");
});

test("recognized settings still reject unknown flat settings", () => {
  assert.throws(
    () => normalizeRecognitionCandidate(
      createRecognitionResult({
        template: {
          section: {
            ...createRecognitionResult().template.section,
            settings: {
              unknownSetting: "value"
            }
          }
        }
      }),
      normalizeRecognitionRequestFields(),
      {}
    ),
    /Unsupported section setting unknownSetting/
  );
});

test("local UAT recognition output returns one safe pending-review AI candidate", () => {
  const output = createUatRecognitionOutput(
    normalizeRecognitionRequestFields({
      locale: "zh-CN",
      pageKey: "home",
      industry: "custom",
      sectionTypeHint: "card_grid",
      purposeHint: "uat workflow"
    }),
    { filename: "uat.png", mimeType: "image/png", size: 1024 }
  );

  assert.equal(output.candidate.source, "ai");
  assert.equal(output.candidate.status, "pending_review");
  assert.equal(output.candidate.content.sections.length, 1);
  assert.equal(output.candidate.content.sections[0].type, "ai_layout");
  assert.equal(output.candidate.content.sections[0].content.canvas.maxWidth, "content");
  assert.ok(output.recognition.detectedElements.length >= 1);
  assert.equal(output.recognition.mode, "uat");
  assert.equal(output.recognition.uatMode, true);
  assert.ok(output.candidate.riskFlags.includes("manual_review_required"));
  assert.ok(output.candidate.riskFlags.includes("low_confidence"));
});

test("low confidence and external links add risk flags and clear unsafe external hrefs", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        section: {
          ...createRecognitionResult().template.section,
          content: {
            ...createRecognitionResult().template.section.content,
            primaryHref: "https://example.com/page"
          }
        }
      },
      recognition: {
        confidence: 0.42,
        riskFlags: []
      }
    }),
    normalizeRecognitionRequestFields(),
    {}
  );

  const button = output.candidate.content.sections[0].content.elements.find((element) => element.type === "button");
  assert.equal(button.href, "");
  assert.ok(output.candidate.riskFlags.includes("low_confidence"));
  assert.ok(output.candidate.riskFlags.includes("external_links_removed"));
  assert.ok(output.candidate.riskFlags.includes("manual_review_required"));
});

test("illegal section type tokens html css js and multiple sections are rejected", () => {
  assert.throws(
    () => normalizeRecognitionCandidate(createRecognitionResult({ template: { section: { type: "free_html", variant: "default", content: {} } } }), normalizeRecognitionRequestFields(), {}),
    /Unsupported section type/
  );
  assert.throws(
    () => normalizeRecognitionCandidate(createRecognitionResult({ template: { section: { ...createRecognitionResult().template.section, settings: { style: { freeCss: "color:red" } } } } }), normalizeRecognitionRequestFields(), {}),
    /Unsupported token/
  );
  assert.throws(
    () => normalizeRecognitionCandidate(createRecognitionResult({ template: { section: { ...createRecognitionResult().template.section, content: { title: "<script>alert(1)</script>" } } } }), normalizeRecognitionRequestFields(), {}),
    /Unsafe (template|AI layout) value/
  );
  assert.throws(
    () => normalizeRecognitionCandidate(createRecognitionResult({ template: { section: { sections: [createRecognitionResult().template.section, createRecognitionResult().template.section] } } }), normalizeRecognitionRequestFields(), {}),
    /exactly one section/
  );
});

test("data URL helper encodes screenshot buffers", () => {
  assert.equal(createDataUrl(Buffer.from("abc"), "image/png"), "data:image/png;base64,YWJj");
});
