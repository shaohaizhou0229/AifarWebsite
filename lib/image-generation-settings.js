import imageGenerationCore from "./image-generation-settings-core.cjs";

export const SUPPORTED_IMAGE_SIZES = imageGenerationCore.SUPPORTED_IMAGE_SIZES;
export const SUPPORTED_IMAGE_QUALITIES = imageGenerationCore.SUPPORTED_IMAGE_QUALITIES;
export const SUPPORTED_IMAGE_OUTPUT_FORMATS = imageGenerationCore.SUPPORTED_IMAGE_OUTPUT_FORMATS;

export function normalizeImageSize(value, fallback = "1024x1024") {
  return imageGenerationCore.normalizeImageSize(value, fallback);
}

export function normalizeImageQuality(value, fallback = "auto") {
  return imageGenerationCore.normalizeImageQuality(value, fallback);
}

export function normalizeImageOutputFormat(value, fallback = "webp") {
  return imageGenerationCore.normalizeImageOutputFormat(value, fallback);
}

export function getImageGenerationSettings() {
  const defaultSize = normalizeImageSize(process.env.OPENAI_IMAGE_DEFAULT_SIZE, "1024x1024");
  const defaultQuality = normalizeImageQuality(process.env.OPENAI_IMAGE_DEFAULT_QUALITY, "auto");
  const outputFormat = normalizeImageOutputFormat(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "webp");
  const model = String(process.env.OPENAI_IMAGE_MODEL || "").trim();
  const hasApiKey = Boolean(String(process.env.OPENAI_API_KEY || "").trim());
  const enabled = String(process.env.OPENAI_IMAGE_ENABLED || "true").trim().toLowerCase() !== "false";

  return {
    provider: "OpenAI",
    enabled,
    hasApiKey,
    model,
    configured: enabled && hasApiKey && Boolean(model),
    defaultSize,
    defaultQuality,
    outputFormat,
    supportedSizes: SUPPORTED_IMAGE_SIZES,
    supportedQualities: SUPPORTED_IMAGE_QUALITIES,
    supportedOutputFormats: SUPPORTED_IMAGE_OUTPUT_FORMATS,
    apiKeyPreview: hasApiKey ? maskSecret(process.env.OPENAI_API_KEY) : ""
  };
}

export function maskSecret(value = "") {
  const secret = String(value || "").trim();
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 3)}************${secret.slice(-4)}`;
}

export function closestImageSizeForSpec(spec = {}, fallback = "1024x1024") {
  return imageGenerationCore.closestImageSizeForSpec(spec, fallback);
}
