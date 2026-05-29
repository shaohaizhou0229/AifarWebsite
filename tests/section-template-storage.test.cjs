const test = require("node:test");
const assert = require("node:assert/strict");
const {
  prepareSectionTemplateCreateInput,
  prepareSectionTemplateMetadataUpdateInput
} = require("../lib/section-template-storage-rules.cjs");

const templateContent = {
  layoutVersion: 2,
  sections: [
    {
      id: "hero-source",
      type: "hero",
      variant: "split",
      settings: {},
      content: {
        title: "Original title",
        lead: "Original lead"
      }
    }
  ]
};

test("AI section template create input is saved as ready and strips unsafe preview fields", () => {
  const input = {
    id: "ai-section-template-preview-1",
    isSystem: true,
    source: "ai",
    status: "pending_review",
    name: "AI block",
    description: "Recognized block",
    industry: "custom",
    purpose: "screenshot_recognition",
    tags: ["ai", "screenshot"],
    riskFlags: ["manual_review_required"],
    sourceImage: { name: "source.png" },
    content: templateContent
  };

  const normalized = prepareSectionTemplateCreateInput(input);

  assert.equal(normalized.id, undefined);
  assert.equal(normalized.isSystem, undefined);
  assert.equal(normalized.sourceImage, undefined);
  assert.equal(normalized.source, "ai");
  assert.equal(normalized.status, "ready");
  assert.deepEqual(normalized.riskFlags, ["manual_review_required"]);
  assert.equal(input.status, "pending_review");
});

test("database section template create input rejects spoofed system templates", () => {
  assert.throws(
    () => prepareSectionTemplateCreateInput({
      name: "Spoofed",
      source: "system",
      content: templateContent
    }),
    /System section templates cannot be created/
  );
});

test("metadata updates cannot replace template content", () => {
  const current = {
    name: "Current",
    description: "Current description",
    industry: "custom",
    purpose: "general",
    tags: ["current"],
    source: "ai",
    status: "ready",
    riskFlags: ["manual_review_required"],
    isFavorite: false,
    content: templateContent
  };
  const updated = prepareSectionTemplateMetadataUpdateInput(current, {
    name: "Renamed",
    tags: ["renamed"],
    content: {
      layoutVersion: 2,
      sections: [
        {
          id: "cta-source",
          type: "cta_band",
          variant: "centered",
          settings: {},
          content: { title: "Malicious replacement" }
        }
      ]
    }
  });

  assert.equal(updated.name, "Renamed");
  assert.deepEqual(updated.tags, ["renamed"]);
  assert.equal(updated.content.sections[0].id, "hero-source");
  assert.equal(updated.content.sections[0].content.title, "Original title");
});
