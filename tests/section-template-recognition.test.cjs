const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_RECOGNITION_TIMEOUT_MS,
  MAX_SCREENSHOT_SIZE,
  buildOpenAIRecognitionPayload,
  createUatRecognitionOutput,
  createDataUrl,
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

test("recognition settings clamp external API timeout", () => {
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "" }).timeoutMs, DEFAULT_RECOGNITION_TIMEOUT_MS);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "1" }).timeoutMs, 5000);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "999999" }).timeoutMs, 120000);
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
});

test("response JSON extraction supports output_text and nested Responses content", () => {
  assert.deepEqual(extractResponseJson({ output_text: "{\"ok\":true}" }), { ok: true });
  assert.deepEqual(
    extractResponseJson({ output: [{ content: [{ type: "output_text", text: "{\"ok\":true}" }] }] }),
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
  assert.equal(output.candidate.content.sections[0].type, "hero");
  assert.ok(output.candidate.riskFlags.includes("manual_review_required"));
  assert.equal(output.recognition.sourceImage.filename, "section.png");
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
  assert.equal(output.candidate.content.sections[0].type, "card_grid");
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

  assert.equal(output.candidate.content.sections[0].content.primaryHref, "");
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
    /Unsafe template value/
  );
  assert.throws(
    () => normalizeRecognitionCandidate(createRecognitionResult({ template: { section: { sections: [createRecognitionResult().template.section, createRecognitionResult().template.section] } } }), normalizeRecognitionRequestFields(), {}),
    /exactly one section/
  );
});

test("data URL helper encodes screenshot buffers", () => {
  assert.equal(createDataUrl(Buffer.from("abc"), "image/png"), "data:image/png;base64,YWJj");
});
