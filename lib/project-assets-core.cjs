const PROJECT_ASSET_BUCKET = "site-content-images";
const MAX_PROJECT_ASSET_SIZE = 5 * 1024 * 1024;
const PROJECT_ASSET_SOURCES = ["upload", "folder_upload", "generated", "system"];
const PROJECT_ASSET_SOURCE_SET = new Set(PROJECT_ASSET_SOURCES);
const ALLOWED_PROJECT_ASSET_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "svg"]);
const ALLOWED_PROJECT_ASSET_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function getAssetExtension(filename = "") {
  const cleanName = clean(filename);
  return cleanName.includes(".") ? cleanName.split(".").pop().toLowerCase() : "";
}

function isAllowedAssetType(type = "") {
  return ALLOWED_PROJECT_ASSET_TYPES.has(clean(type).toLowerCase());
}

function isAllowedAssetExtension(filename = "") {
  return ALLOWED_PROJECT_ASSET_EXTENSIONS.has(getAssetExtension(filename));
}

function normalizeAssetDirectory(value = "") {
  const normalized = clean(value)
    .replace(/\\/g, "/")
    .replace(/\0/g, "")
    .replace(/^[a-z]:/i, "")
    .replace(/^\/+|\/+$/g, "");

  return normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.slice(0, 120))
    .join("/");
}

function splitRelativeAssetPath(value = "") {
  const normalized = clean(value).replace(/\\/g, "/").replace(/\0/g, "");
  const parts = normalized.split("/").filter(Boolean);
  const filename = parts.pop() || normalized || "";
  return {
    directoryPath: normalizeAssetDirectory(parts.join("/")),
    filename: clean(filename)
  };
}

function normalizeAssetSource(value = "") {
  const source = clean(value);
  return PROJECT_ASSET_SOURCE_SET.has(source) ? source : "upload";
}

function normalizeAssetTags(value) {
  const source = Array.isArray(value) ? value : clean(value).split(",");
  const seen = new Set();
  return source
    .map((item) => clean(item).slice(0, 32))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function normalizeAssetTagName(value = "") {
  return normalizeAssetTags([value])[0] || "";
}

function validateAssetFileInput(file = {}) {
  const filename = clean(file.name);
  const type = clean(file.type).toLowerCase();
  const size = Number(file.size || 0);

  if (!filename) {
    return { ok: false, code: "missingName" };
  }
  if (!isAllowedAssetExtension(filename) || !isAllowedAssetType(type)) {
    return { ok: false, code: "unsupportedType" };
  }
  if (!size || size > MAX_PROJECT_ASSET_SIZE) {
    return { ok: false, code: "tooLarge" };
  }
  return { ok: true, code: "ok" };
}

function normalizeAssetSearchParams(input = {}) {
  const q = clean(input.q || input.query).slice(0, 80);
  const directoryPath = normalizeAssetDirectory(input.directoryPath || input.directory);
  const source = PROJECT_ASSET_SOURCE_SET.has(clean(input.source)) ? clean(input.source) : "";
  const tag = normalizeAssetTagName(input.tag);
  const page = clamp(input.page, 1, 500, 1);
  const limit = clamp(input.limit, 1, 60, 24);
  return { q, directoryPath, source, tag, page, limit, offset: (page - 1) * limit };
}

function normalizeAssetUpdateInput(input = {}) {
  const displayName = clean(input.displayName).slice(0, 120);
  const altText = clean(input.altText).slice(0, 300);
  const directoryPath = normalizeAssetDirectory(input.directoryPath);
  const tags = normalizeAssetTags(input.tags);

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  return {
    displayName,
    altText,
    directoryPath,
    tags
  };
}

function sanitizeStorageExtension(filename = "") {
  const extension = getAssetExtension(filename) || "webp";
  return ALLOWED_PROJECT_ASSET_EXTENSIONS.has(extension) ? extension.replace(/[^a-z0-9]/g, "") : "webp";
}

module.exports = {
  ALLOWED_PROJECT_ASSET_EXTENSIONS,
  ALLOWED_PROJECT_ASSET_TYPES,
  MAX_PROJECT_ASSET_SIZE,
  PROJECT_ASSET_BUCKET,
  PROJECT_ASSET_SOURCES,
  getAssetExtension,
  isAllowedAssetExtension,
  isAllowedAssetType,
  normalizeAssetDirectory,
  normalizeAssetSearchParams,
  normalizeAssetSource,
  normalizeAssetTagName,
  normalizeAssetTags,
  normalizeAssetUpdateInput,
  sanitizeStorageExtension,
  splitRelativeAssetPath,
  validateAssetFileInput
};
