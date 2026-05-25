const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

function loadSitePageBuilder() {
  const filename = path.join(__dirname, "..", "lib", "site-page-builder.js");
  const source = fs
    .readFileSync(filename, "utf8")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ");
  const context = {
    module: { exports: {} },
    exports: {}
  };
  vm.runInNewContext(
    `${source}\nmodule.exports = { SITE_LAYOUT_VERSION, normalizeSitePageContent };`,
    context,
    { filename }
  );
  return context.module.exports;
}

test("explicit page designer layouts do not auto-add support entry blocks", () => {
  const { SITE_LAYOUT_VERSION, normalizeSitePageContent } = loadSitePageBuilder();
  const fallback = { seo: {}, title: "Home", lead: "Lead" };
  const content = {
    layoutVersion: SITE_LAYOUT_VERSION,
    seo: {},
    sections: []
  };

  const normalized = normalizeSitePageContent("home", fallback, content);

  assert.equal(normalized.sections.length, 0);
});

test("legacy home content still receives support entry during migration", () => {
  const { normalizeSitePageContent } = loadSitePageBuilder();
  const fallback = { seo: {}, title: "Home", lead: "Lead" };

  const normalized = normalizeSitePageContent("home", fallback, null);

  assert.equal(normalized.sections.some((section) => section.type === "support_entry"), true);
});
