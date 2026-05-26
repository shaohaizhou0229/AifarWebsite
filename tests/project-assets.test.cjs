const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_PROJECT_ASSET_SIZE,
  normalizeAssetDirectory,
  normalizeAssetSearchParams,
  normalizeAssetUpdateInput,
  splitRelativeAssetPath,
  validateAssetFileInput
} = require("../lib/project-assets-core.cjs");

test("asset validation accepts the configured image formats up to 5 MB", () => {
  for (const [name, type] of [
    ["hero.jpg", "image/jpeg"],
    ["hero.png", "image/png"],
    ["hero.webp", "image/webp"],
    ["hero.svg", "image/svg+xml"]
  ]) {
    assert.deepEqual(validateAssetFileInput({ name, type, size: MAX_PROJECT_ASSET_SIZE }), { ok: true, code: "ok" });
  }
});

test("asset validation rejects oversized and unsupported files", () => {
  assert.equal(validateAssetFileInput({ name: "hero.gif", type: "image/gif", size: 1024 }).code, "unsupportedType");
  assert.equal(validateAssetFileInput({ name: "hero.png", type: "image/png", size: MAX_PROJECT_ASSET_SIZE + 1 }).code, "tooLarge");
  assert.equal(validateAssetFileInput({ name: "", type: "image/png", size: 1024 }).code, "missingName");
});

test("folder uploads preserve safe relative directories", () => {
  assert.deepEqual(splitRelativeAssetPath("campaign/home/hero.png"), {
    directoryPath: "campaign/home",
    filename: "hero.png"
  });
  assert.equal(normalizeAssetDirectory("../campaign\\home//./"), "campaign/home");
});

test("asset search and update input are normalized", () => {
  assert.deepEqual(normalizeAssetSearchParams({ q: " hero ", directory: " home ", source: "generated", page: "2", limit: "100" }), {
    q: "hero",
    directoryPath: "home",
    source: "generated",
    page: 2,
    limit: 60,
    offset: 60
  });
  assert.deepEqual(normalizeAssetUpdateInput({
    displayName: " Hero ",
    altText: " Main image ",
    directoryPath: "home",
    tags: "hero, website, hero"
  }), {
    displayName: "Hero",
    altText: "Main image",
    directoryPath: "home",
    tags: ["hero", "website"]
  });
});
