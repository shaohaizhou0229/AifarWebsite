const SUPPORTED_IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const SUPPORTED_IMAGE_QUALITIES = ["auto", "low", "medium", "high"];
const SUPPORTED_IMAGE_OUTPUT_FORMATS = ["png", "jpeg", "webp"];

function normalizeImageSize(value, fallback = "1024x1024") {
  const size = String(value || "").trim();
  return SUPPORTED_IMAGE_SIZES.includes(size) ? size : fallback;
}

function normalizeImageQuality(value, fallback = "auto") {
  const quality = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_QUALITIES.includes(quality) ? quality : fallback;
}

function normalizeImageOutputFormat(value, fallback = "webp") {
  const format = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_OUTPUT_FORMATS.includes(format) ? format : fallback;
}

function closestImageSizeForSpec(spec = {}, fallback = "1024x1024") {
  const width = Number(spec.width || spec.targetWidth || 0);
  const height = Number(spec.height || spec.targetHeight || 0);
  if (!width || !height) return normalizeImageSize(spec.size, fallback);

  const targetRatio = width / height;
  return SUPPORTED_IMAGE_SIZES.reduce((best, size) => {
    const [nextWidth, nextHeight] = size.split("x").map(Number);
    const nextScore = Math.abs((nextWidth / nextHeight) - targetRatio);
    return nextScore < best.score ? { size, score: nextScore } : best;
  }, { size: normalizeImageSize(fallback, "1024x1024"), score: Number.POSITIVE_INFINITY }).size;
}

module.exports = {
  SUPPORTED_IMAGE_SIZES,
  SUPPORTED_IMAGE_QUALITIES,
  SUPPORTED_IMAGE_OUTPUT_FORMATS,
  closestImageSizeForSpec,
  normalizeImageOutputFormat,
  normalizeImageQuality,
  normalizeImageSize
};
