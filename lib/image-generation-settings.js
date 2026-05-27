export const SUPPORTED_IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
export const SUPPORTED_IMAGE_QUALITIES = ["auto", "low", "medium", "high"];
export const SUPPORTED_IMAGE_OUTPUT_FORMATS = ["png", "jpeg", "webp"];

export function normalizeImageSize(value, fallback = "1024x1024") {
  const size = String(value || "").trim();
  return SUPPORTED_IMAGE_SIZES.includes(size) ? size : fallback;
}

export function normalizeImageQuality(value, fallback = "auto") {
  const quality = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_QUALITIES.includes(quality) ? quality : fallback;
}

export function normalizeImageOutputFormat(value, fallback = "webp") {
  const format = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_OUTPUT_FORMATS.includes(format) ? format : fallback;
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
  const width = Number(spec.width || spec.targetWidth || 0);
  const height = Number(spec.height || spec.targetHeight || 0);
  if (!width || !height) return normalizeImageSize(spec.size, fallback);

  const targetRatio = width / height;
  return SUPPORTED_IMAGE_SIZES.reduce((best, size) => {
    const [nextWidth, nextHeight] = size.split("x").map(Number);
    const nextScore = Math.abs((nextWidth / nextHeight) - targetRatio);
    return nextScore < best.score ? { size, score: nextScore } : best;
  }, { size: fallback, score: Number.POSITIVE_INFINITY }).size;
}
