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
const {
  buildSiliconFlowImagePayload
} = require("../lib/image-generation-settings-core.cjs");

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

test("AI service settings only include raw secrets when explicitly requested", () => {
  const publicSettings = getAiServiceSettings({
    AI_IMAGE_PROVIDER: "siliconflow",
    SILICONFLOW_API_KEY: "sf-test-secret",
    SILICONFLOW_IMAGE_MODEL: "Kwai-Kolors/Kolors"
  });
  const privateSettings = getAiServiceSettings({
    AI_IMAGE_PROVIDER: "siliconflow",
    SILICONFLOW_API_KEY: "sf-test-secret",
    SILICONFLOW_IMAGE_MODEL: "Kwai-Kolors/Kolors"
  }, { includeSecret: true });

  assert.equal(publicSettings.imageGeneration.apiKey, undefined);
  assert.equal(privateSettings.imageGeneration.apiKey, "sf-test-secret");
});

test("AI service settings expose SiliconFlow provider configuration", () => {
  const settings = getAiServiceSettings({
    AI_IMAGE_PROVIDER: "siliconflow",
    AI_SECTION_TEMPLATE_PROVIDER: "siliconflow",
    SILICONFLOW_API_KEY: "sf-test-secret",
    SILICONFLOW_BASE_URL: "https://api.siliconflow.cn/v1/",
    SILICONFLOW_IMAGE_MODEL: "Kwai-Kolors/Kolors",
    SILICONFLOW_VISION_MODEL: "Qwen/Qwen2.5-VL-72B-Instruct",
    SILICONFLOW_TEXT_MODEL: "Qwen/Qwen3-32B",
    SILICONFLOW_TIMEOUT_MS: "52000"
  });

  assert.equal(settings.imageGeneration.providerKey, "siliconflow");
  assert.equal(settings.imageGeneration.provider, "SiliconFlow");
  assert.equal(settings.imageGeneration.baseUrl, "https://api.siliconflow.cn/v1");
  assert.equal(settings.imageGeneration.configured, true);
  assert.equal(settings.sectionTemplateRecognition.providerKey, "siliconflow");
  assert.equal(settings.sectionTemplateRecognition.configured, true);
  assert.deepEqual(settings.sectionTemplateRecognition.modelIds, [
    "Qwen/Qwen2.5-VL-72B-Instruct",
    "Qwen/Qwen3-32B"
  ]);
  assert.equal(settings.sectionTemplateRecognition.timeoutMs, 52000);
});

test("AI service settings fall back to OpenAI for unknown providers", () => {
  const settings = getImageGenerationSettings({
    AI_IMAGE_PROVIDER: "unknown",
    OPENAI_API_KEY: "sk-test-secret",
    OPENAI_IMAGE_MODEL: "gpt-image-1"
  });

  assert.equal(settings.providerKey, "openai");
  assert.equal(settings.configured, true);
});

test("SiliconFlow image payload maps quality to stable generation knobs", () => {
  const payload = buildSiliconFlowImagePayload({
    model: "Kwai-Kolors/Kolors",
    prompt: "A clean product hero background",
    size: "1024x1536",
    quality: "high"
  });

  assert.equal(payload.model, "Kwai-Kolors/Kolors");
  assert.equal(payload.image_size, "1024x1536");
  assert.equal(payload.batch_size, 1);
  assert.equal(payload.num_inference_steps, 40);
  assert.equal(payload.guidance_scale, 8);
});

test("section recognition settings expose local-only UAT mode state", () => {
  const localSettings = getSectionTemplateRecognitionServiceSettings({
    OPENAI_SECTION_TEMPLATE_UAT_MODE: "true",
    NODE_ENV: "development"
  });
  const productionSettings = getSectionTemplateRecognitionServiceSettings({
    OPENAI_SECTION_TEMPLATE_UAT_MODE: "true",
    NODE_ENV: "production"
  });

  assert.equal(localSettings.configured, false);
  assert.equal(localSettings.uatModeRequested, true);
  assert.equal(localSettings.uatModeAvailable, true);
  assert.equal(localSettings.uatModeEnabled, true);
  assert.equal(productionSettings.uatModeRequested, true);
  assert.equal(productionSettings.uatModeAvailable, false);
  assert.equal(productionSettings.uatModeEnabled, false);
});

test("AI settings test target defaults to image generation and accepts recognition", () => {
  assert.equal(normalizeAiSettingsTestTarget(""), AI_SETTINGS_TEST_TARGETS.imageGeneration);
  assert.equal(normalizeAiSettingsTestTarget("unknown"), AI_SETTINGS_TEST_TARGETS.imageGeneration);
  assert.equal(
    normalizeAiSettingsTestTarget("sectionTemplateRecognition"),
    AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition
  );
});
