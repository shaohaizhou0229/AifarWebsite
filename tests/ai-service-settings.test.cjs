const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AI_SETTINGS_TEST_TARGETS,
  getAiServiceSettings,
  getImageGenerationSettings,
  getSectionTemplateRecognitionServiceSettings,
  maskSecret,
  normalizeAiSettingsTestTarget
} = require("../lib/ai-service-settings.cjs");

test("AI service settings expose image generation and section recognition status", () => {
  const settings = getAiServiceSettings({
    OPENAI_API_KEY: "sk-test-secret",
    OPENAI_IMAGE_ENABLED: "true",
    OPENAI_IMAGE_MODEL: "gpt-image-1",
    OPENAI_IMAGE_OUTPUT_FORMAT: "webp",
    OPENAI_IMAGE_DEFAULT_SIZE: "1024x1536",
    OPENAI_IMAGE_DEFAULT_QUALITY: "high",
    OPENAI_SECTION_TEMPLATE_ENABLED: "true",
    OPENAI_SECTION_TEMPLATE_MODEL: "gpt-4.1-mini",
    OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: "32000"
  });

  assert.equal(settings.imageGeneration.configured, true);
  assert.equal(settings.imageGeneration.defaultSize, "1024x1536");
  assert.equal(settings.imageGeneration.defaultQuality, "high");
  assert.equal(settings.sectionTemplateRecognition.configured, true);
  assert.equal(settings.sectionTemplateRecognition.timeoutMs, 32000);
});

test("AI service settings treat blank quoted secrets as missing", () => {
  const imageSettings = getImageGenerationSettings({
    OPENAI_API_KEY: "\"\"",
    OPENAI_IMAGE_MODEL: "gpt-image-1"
  });
  const recognitionSettings = getSectionTemplateRecognitionServiceSettings({
    OPENAI_API_KEY: "''",
    OPENAI_SECTION_TEMPLATE_MODEL: "gpt-4.1-mini"
  });

  assert.equal(imageSettings.configured, false);
  assert.equal(imageSettings.hasApiKey, false);
  assert.equal(recognitionSettings.configured, false);
  assert.equal(recognitionSettings.hasApiKey, false);
  assert.equal(maskSecret("\"\""), "");
});

test("AI settings test target defaults to image generation and accepts recognition", () => {
  assert.equal(normalizeAiSettingsTestTarget(""), AI_SETTINGS_TEST_TARGETS.imageGeneration);
  assert.equal(normalizeAiSettingsTestTarget("unknown"), AI_SETTINGS_TEST_TARGETS.imageGeneration);
  assert.equal(
    normalizeAiSettingsTestTarget("sectionTemplateRecognition"),
    AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition
  );
});
