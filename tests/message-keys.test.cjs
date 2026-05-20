const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const locales = ["en", "zh-CN", "fr", "ar"];

function collectMessageKeys(value, prefix = "") {
  if (Array.isArray(value) || !value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectMessageKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

function readMessages(locale) {
  return JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));
}

test("all locale message files keep the same key shape as English", () => {
  const baseKeys = collectMessageKeys(readMessages("en")).sort();

  for (const locale of locales.slice(1)) {
    const keys = collectMessageKeys(readMessages(locale)).sort();
    assert.deepEqual(keys, baseKeys, `${locale} message keys must match en.json`);
  }
});
