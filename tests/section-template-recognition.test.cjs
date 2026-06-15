const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_RECOGNITION_TIMEOUT_MS,
  DEFAULT_SILICONFLOW_RECOGNITION_TIMEOUT_MS,
  MAX_SCREENSHOT_SIZE,
  buildOpenAIJsonRepairPayload,
  buildOpenAIRecognitionPayload,
  buildSiliconFlowDirectRecognitionPayload,
  buildSiliconFlowJsonRepairPayload,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createUatRecognitionOutput,
  createDataUrl,
  extractChatCompletionText,
  extractResponseText,
  extractResponseJson,
  getImageDimensionsFromBuffer,
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
  const defaultModelSettings = getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "sk-test", OPENAI_SECTION_TEMPLATE_MODEL: "" });
  assert.equal(defaultModelSettings.model, "gpt-5.5");
  assert.equal(defaultModelSettings.configured, true);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "\"\"", OPENAI_SECTION_TEMPLATE_MODEL: "\"\"" }).configured, false);
  assert.equal(getSectionTemplateRecognitionSettings({ OPENAI_SECTION_TEMPLATE_ENABLED: "true", OPENAI_API_KEY: "sk-test", OPENAI_SECTION_TEMPLATE_MODEL: "gpt-5.5" }).configured, true);
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
    model: "gpt-5.5",
    dataUrl: "data:image/png;base64,AAAA",
    fields: normalizeRecognitionRequestFields({ locale: "en" })
  });

  assert.equal(payload.model, "gpt-5.5");
  assert.equal(payload.input[1].content[1].type, "input_image");
  assert.equal(payload.input[1].content[1].detail, "original");
  assert.equal(payload.text.format.type, "json_schema");
  assert.match(payload.input[1].content[0].text, /normalized x, y, width, height/);
  assert.match(payload.input[1].content[0].text, /Do not return an empty elements array/);
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
  assert.match(visionPayload.messages[1].content[0].text, /ELEMENT_JSON/);
  assert.match(templatePayload.messages[1].content, /screenshot_composition/);
  assert.match(templatePayload.messages[1].content, /pricing-card compression/);
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
  assert.match(payload.messages[1].content[0].text, /one compact card element per visible plan/);
  assert.equal(payload.messages[1].content[1].image_url.url, "data:image/webp;base64,AAA");
});

test("response JSON extraction supports output_text and nested Responses content", () => {
  assert.equal(extractResponseText({ output_text: "{\"ok\":true}" }), "{\"ok\":true}");
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

test("malformed provider JSON is reported as repairable recognition JSON", () => {
  assert.throws(
    () => extractResponseJson({
      choices: [
        {
          message: {
            content: "{\"template\":{\"name\":\"Pricing\",\"tags\":[\"pricing\" \"plans\"]},\"recognition\":{\"confidence\":0.6}}"
          }
        }
      ]
    }),
    (error) => {
      assert.equal(error.code, "invalid_recognition_json");
      assert.match(error.rawText, /Pricing/);
      assert.match(error.parseMessage, /Expected|JSON/);
      return true;
    }
  );
});

test("JSON repair payloads keep malformed pricing output compact and schema-bound", () => {
  const fields = normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home", industry: "custom" });
  const siliconFlowPayload = buildSiliconFlowJsonRepairPayload({
    model: "Qwen/Qwen3-32B",
    rawText: "{\"template\":{\"name\":\"Pricing\",\"section\":{\"content\":{\"elements\":[",
    parseError: { parseMessage: "Expected ',' or ']' after array element" },
    fields
  });
  const openAiPayload = buildOpenAIJsonRepairPayload({
    model: "gpt-5.5",
    rawText: "{\"template\":{\"name\":\"Pricing\"",
    parseError: { parseMessage: "Unexpected end of JSON input" },
    fields
  });

  assert.equal(siliconFlowPayload.response_format.type, "json_object");
  assert.equal(siliconFlowPayload.temperature, 0);
  assert.match(siliconFlowPayload.messages[1].content, /one card element per plan/);
  assert.match(siliconFlowPayload.messages[1].content, /Malformed JSON/);
  assert.equal(openAiPayload.text.format.name, "section_template_recognition_repair");
  assert.match(openAiPayload.input[1].content[0].text, /ai_layout/);
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

test("recognition tolerates non-object detected elements from AI output", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      recognition: {
        detectedElements: [
          "headline: ignored",
          {
            id: "headline-1",
            type: "text",
            text: "Take quick action",
            box: { x: 0.2, y: 0.18, width: 0.6, height: 0.12 },
            zIndex: 2
          },
          null
        ]
      }
    }),
    normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" }),
    { filename: "section.png", mimeType: "image/png", size: 1024 }
  );

  assert.equal(output.candidate.content.sections[0].type, "ai_layout");
  assert.equal(output.recognition.detectedElements.length, 1);
  assert.equal(output.recognition.detectedElements[0].type, "text");
  assert.equal(output.recognition.detectedElements[0].text, "Take quick action");
});

test("recognition tolerates non-object ai layout content elements", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        section: {
          id: "ai-layout",
          type: "ai_layout",
          variant: "screenshot_composition",
          settings: {
            style: { textSize: "medium" },
            layout: { contentAlign: "center" }
          },
          content: {
            canvas: {
              aspectRatio: 1.6,
              background: "default",
              padding: "normal",
              maxWidth: "content",
              mobileMode: "scale"
            },
            elements: [
              "button: ignored",
              {
                id: "button-1",
                type: "button",
                text: "Try Demo",
                href: "/contact/",
                box: { x: 0.44, y: 0.36, width: 0.12, height: 0.06 },
                zIndex: 3
              }
            ]
          }
        }
      },
      recognition: {
        detectedElements: ["invalid detected element"]
      }
    }),
    normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" }),
    { filename: "section.png", mimeType: "image/png", size: 1024 }
  );

  const elements = output.candidate.content.sections[0].content.elements;
  assert.equal(elements.length, 1);
  assert.equal(elements[0].type, "button");
  assert.equal(output.recognition.detectedElements.length, 1);
  assert.equal(output.recognition.detectedElements[0].type, "button");
});

test("empty AI layout output falls back to a reviewable hero composition", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        name: "Hero with badge and demo CTA",
        description: "A centered hero section with a headline, subheadline, demo button, and large image placeholder.",
        purpose: "feature_hero",
        tags: ["hero", "demo"],
        section: {
          id: "ai-layout",
          type: "ai_layout",
          variant: "screenshot_composition",
          settings: {
            style: { textSize: "medium" },
            layout: { contentAlign: "center" }
          },
          content: {
            canvas: {
              aspectRatio: 1.6,
              background: "default",
              padding: "normal",
              maxWidth: "content",
              mobileMode: "scale"
            },
            elements: []
          }
        }
      },
      recognition: {
        detectedElements: []
      }
    }),
    normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" }),
    { filename: "section.png", mimeType: "image/png", size: 1024 }
  );

  const elements = output.candidate.content.sections[0].content.elements;
  assert.equal(elements.length, 5);
  assert.deepEqual(elements.map((element) => element.type), ["badge", "text", "text", "button", "image"]);
  assert.equal(elements[1].text, "Hero with badge and demo CTA");
  assert.equal(elements[3].text, "Try Demo");
  assert.equal(output.recognition.detectedElements.length, 5);
});

test("AI layout recognition preserves screenshot ratio and stabilizes centered hero geometry", () => {
  const output = normalizeRecognitionCandidate(
    createRecognitionResult({
      template: {
        name: "Hero with badge and demo CTA",
        description: "A centered hero section with a headline, supporting paragraph, button, and large media slot.",
        purpose: "feature_hero",
        tags: ["hero", "demo"],
        section: {
          id: "ai-layout",
          type: "ai_layout",
          variant: "screenshot_composition",
          settings: {
            style: { textSize: "medium" },
            layout: { contentAlign: "center" }
          },
          content: {
            canvas: {
              background: "default",
              padding: "normal",
              maxWidth: "content",
              mobileMode: "scale"
            },
            elements: [
              { id: "badge-1", type: "badge", text: "NEW FEATURE", box: { x: 0.49, y: 0.07, width: 0.05, height: 0.02 } },
              { id: "title-1", type: "text", text: "Take quick action that increases your brand's regular profit.", box: { x: 0.25, y: 0.13, width: 0.5, height: 0.08 }, appearance: { weight: "800" } },
              { id: "lead-1", type: "text", text: "If you have ever wondered how to develop your brand, this is the place for you. Take a big step forward in growing your business with this great tool.", box: { x: 0.25, y: 0.22, width: 0.5, height: 0.05 } },
              { id: "button-1", type: "button", text: "Try Demo", box: { x: 0.49, y: 0.3, width: 0.12, height: 0.03 } },
              { id: "image-1", type: "image", alt: "Image placeholder", box: { x: 0.58, y: 0.48, width: 0.36, height: 0.33 } }
            ]
          }
        }
      },
      recognition: {
        detectedElements: []
      }
    }),
    normalizeRecognitionRequestFields({ locale: "zh-CN", pageKey: "home" }),
    { filename: "section.png", mimeType: "image/png", size: 1024, width: 691, height: 482 }
  );

  const section = output.candidate.content.sections[0];
  const image = section.content.elements.find((element) => element.role === "media");
  const lead = section.content.elements.find((element) => element.role === "body");
  const button = section.content.elements.find((element) => element.role === "cta");

  assert.equal(section.content.canvas.sourceWidth, 691);
  assert.equal(section.content.canvas.sourceHeight, 482);
  assert.equal(section.content.canvas.aspectRatio, 1.4336);
  assert.ok(image.box.x >= 0.16 && image.box.x <= 0.24);
  assert.ok(image.box.width >= 0.58);
  assert.equal(image.appearance.variant, "placeholder-solid");
  assert.equal(image.appearance.fill, "purple");
  assert.ok(lead.box.height > 0.05);
  assert.equal(button.appearance.variant, "solid");
  assert.equal(button.appearance.fill, "purple");
  assert.equal(output.recognition.detectedElements.find((element) => element.role === "media").box.x, image.box.x);
});

test("recognition reads image dimensions from PNG buffers", () => {
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lv8Z5QAAAABJRU5ErkJggg==",
    "base64"
  );
  assert.deepEqual(getImageDimensionsFromBuffer(onePixelPng), { width: 1, height: 1 });
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
