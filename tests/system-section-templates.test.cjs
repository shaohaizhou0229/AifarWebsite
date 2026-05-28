const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SYSTEM_SITE_SECTION_TEMPLATES,
  isSystemSectionTemplateId,
  listSystemSectionTemplates,
  mergeSectionTemplateLists
} = require("../lib/system-section-templates.cjs");
const {
  createInsertableSectionFromTemplate,
  normalizeSectionTemplateInput
} = require("../lib/section-template-rules.cjs");

test("system section templates provide the first 16 built-in block patterns", () => {
  assert.equal(SYSTEM_SITE_SECTION_TEMPLATES.length, 16);

  const ids = SYSTEM_SITE_SECTION_TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.every(isSystemSectionTemplateId), true);
});

test("every system section template passes the shared safety rules", () => {
  for (const template of SYSTEM_SITE_SECTION_TEMPLATES) {
    const normalized = normalizeSectionTemplateInput({
      name: template.name,
      description: template.description,
      industry: template.industry,
      purpose: template.purpose,
      tags: template.tags,
      source: template.source,
      status: template.status,
      content: template.content
    });
    const inserted = createInsertableSectionFromTemplate(normalized.content, { idSuffix: "review" });

    assert.equal(normalized.content.sections.length, 1);
    assert.equal(inserted.id.endsWith("-review"), true);
  }
});

test("system section template filters respect source industry and page", () => {
  assert.equal(listSystemSectionTemplates({ source: "manual" }).length, 0);
  assert.equal(listSystemSectionTemplates({ source: "system" }).length, 16);
  assert.equal(listSystemSectionTemplates({ industry: "public_service" }).length, 4);
  assert.equal(listSystemSectionTemplates({ industry: "marketing" }).length, 4);
  assert.equal(listSystemSectionTemplates({ industry: "tourism" }).length, 4);
  assert.equal(listSystemSectionTemplates({ industry: "corporate" }).length, 4);

  const homeTemplates = listSystemSectionTemplates({ pageKey: "home" });
  assert.equal(homeTemplates.some((template) => template.id === "system-public-service-process-steps"), true);
  assert.equal(homeTemplates.some((template) => template.id === "system-marketing-benefit-cards"), false);
});

test("system and database section templates merge for the list API shape", () => {
  const databaseTemplate = {
    id: "database-template",
    locale: "en",
    name: "Saved template",
    source: "manual",
    isSystem: false
  };

  const merged = mergeSectionTemplateLists([databaseTemplate], { locale: "en" });

  assert.equal(merged.length, 17);
  assert.equal(merged[0].isSystem, true);
  assert.equal(merged.at(-1).id, "database-template");
  assert.equal(merged.at(-1).isSystem, false);
});

test("manual and ai filters do not include system templates", () => {
  assert.deepEqual(mergeSectionTemplateLists([], { source: "manual" }), []);
  assert.deepEqual(mergeSectionTemplateLists([], { source: "ai" }), []);
});
