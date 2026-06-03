const assert = require("node:assert/strict");
const test = require("node:test");

const {
  addAiLayoutElement,
  applyAiLayoutStyleRecord,
  createAiLayoutStyleRecord,
  duplicateAiLayoutElement,
  patchAiLayoutElementAppearance,
  patchAiLayoutElementBox,
  resetAiLayoutElementAppearance,
  removeAiLayoutElement,
  restoreAiLayoutElementBox,
  toggleAiLayoutElementLock
} = require("../lib/ai-layout-editor.cjs");
const { normalizeSectionTemplateContent } = require("../lib/section-template-rules.cjs");

function sampleSection() {
  return {
    id: "ai-layout-1",
    type: "ai_layout",
    variant: "screenshot_composition",
    settings: {},
    content: {
      canvas: { aspectRatio: 1.6 },
      elements: [
        {
          id: "title",
          type: "text",
          role: "headline",
          text: "Title",
          box: { x: 0.2, y: 0.1, width: 0.6, height: 0.1 },
          appearance: { textSize: "lg", weight: "700" }
        },
        {
          id: "button",
          type: "button",
          role: "cta",
          text: "Start",
          box: { x: 0.44, y: 0.32, width: 0.14, height: 0.06 },
          appearance: { variant: "solid", fill: "purple" }
        },
        {
          id: "button-2",
          type: "button",
          role: "cta",
          text: "More",
          box: { x: 0.6, y: 0.32, width: 0.14, height: 0.06 },
          appearance: { variant: "outline", fill: "default" }
        }
      ]
    }
  };
}

test("ai layout editor clamps element boxes and preserves original box", () => {
  const section = patchAiLayoutElementBox(sampleSection(), "button", {
    x: 0.94,
    y: 0.97,
    width: 0.3,
    height: 0.2
  });
  const button = section.content.elements.find((element) => element.id === "button");

  assert.deepEqual(button.originalBox, { x: 0.44, y: 0.32, width: 0.14, height: 0.06 });
  assert.equal(button.box.x, 0.94);
  assert.equal(button.box.y, 0.97);
  assert.equal(button.box.width, 0.06);
  assert.equal(button.box.height, 0.03);
});

test("ai layout editor duplicates, removes, adds and restores elements safely", () => {
  const duplicated = duplicateAiLayoutElement(sampleSection(), "button");
  assert.equal(duplicated.section.content.elements.length, 4);
  assert.notEqual(duplicated.element.id, "button");

  const removed = removeAiLayoutElement(duplicated.section, duplicated.element.id);
  assert.equal(removed.content.elements.length, 3);

  const added = addAiLayoutElement(removed, "image");
  assert.equal(added.element.type, "image");
  assert.equal(added.section.content.elements.length, 4);

  const moved = patchAiLayoutElementBox(sampleSection(), "title", { x: 0.5 });
  const restored = restoreAiLayoutElementBox(moved, "title");
  assert.equal(restored.content.elements[0].box.x, 0.2);
});

test("ai layout style records save appearance only and can apply to same type", () => {
  const section = sampleSection();
  const button = section.content.elements.find((element) => element.id === "button");
  const record = createAiLayoutStyleRecord({
    name: "CTA",
    scope: "sameType",
    element: {
      ...button,
      text: "Do not save this text",
      appearance: { variant: "solid", fill: "purple", radius: "medium", shadow: "medium" }
    },
    tags: ["cta"]
  });

  assert.equal(record.name, "CTA");
  assert.equal(record.appearance.fill, "purple");
  assert.equal(record.text, undefined);

  const applied = applyAiLayoutStyleRecord(section, record, "button", "sameType");
  const buttons = applied.content.elements.filter((element) => element.type === "button");
  assert.equal(buttons[0].appearance.shadow, "medium");
  assert.equal(buttons[1].appearance.shadow, "medium");
  assert.equal(applied.content.elements[0].appearance.shadow, undefined);
});

test("ai layout appearance patches respect scope", () => {
  const section = patchAiLayoutElementAppearance(sampleSection(), "button", { radius: "large" }, "sameType");

  assert.equal(section.content.elements[1].appearance.radius, "large");
  assert.equal(section.content.elements[2].appearance.radius, "large");
  assert.equal(section.content.elements[0].appearance.radius, undefined);
});

test("ai layout style reset lock toggle and grouped card movement are safe", () => {
  const base = {
    ...sampleSection(),
    content: {
      ...sampleSection().content,
      elements: [
        {
          id: "card",
          type: "card",
          role: "card",
          groupId: "pricing-pro",
          box: { x: 0.2, y: 0.4, width: 0.24, height: 0.34 },
          appearance: { shadow: "medium" }
        },
        {
          id: "price",
          type: "text",
          role: "headline",
          groupId: "pricing-pro",
          text: "$65",
          box: { x: 0.25, y: 0.5, width: 0.14, height: 0.08 },
          appearance: { textSize: "xl" }
        }
      ]
    }
  };

  const moved = patchAiLayoutElementBox(base, "card", { x: 0.3, y: 0.45 });
  assert.equal(moved.content.elements[0].box.x, 0.3);
  assert.equal(moved.content.elements[1].box.x, 0.35);
  assert.equal(moved.content.elements[1].box.y, 0.55);

  const reset = resetAiLayoutElementAppearance(moved, "card", "section");
  assert.deepEqual(reset.content.elements[0].appearance, {});
  assert.deepEqual(reset.content.elements[1].appearance, {});

  const locked = toggleAiLayoutElementLock(reset, "card");
  assert.equal(locked.content.elements[0].locked, true);
  const blockedMove = patchAiLayoutElementBox(locked, "card", { x: 0.1 });
  assert.equal(blockedMove.content.elements[0].box.x, 0.3);
});

test("ai layout validation preserves safe editor fields and rejects unsafe style strings", () => {
  const normalized = normalizeSectionTemplateContent({
    type: "ai_layout",
    variant: "screenshot_composition",
    content: {
      elements: [
        {
          id: "button",
          type: "button",
          role: "cta",
          label: "Primary button",
          groupId: "hero-actions",
          locked: true,
          text: "Start",
          box: { x: 0.4, y: 0.3, width: 0.2, height: 0.08 },
          originalBox: { x: 0.3, y: 0.3, width: 0.2, height: 0.08 },
          appearance: { shadow: "medium", hover: "lift", border: "subtle", gap: "normal" }
        }
      ]
    }
  });
  const element = normalized.sections[0].content.elements[0];

  assert.equal(element.label, "Primary button");
  assert.equal(element.groupId, "hero-actions");
  assert.equal(element.locked, true);
  assert.equal(element.originalBox.x, 0.3);
  assert.equal(element.appearance.shadow, "medium");
  assert.equal(element.appearance.hover, "lift");
  assert.equal(element.appearance.border, "subtle");
  assert.equal(element.appearance.gap, "normal");

  assert.throws(
    () => normalizeSectionTemplateContent({
      type: "ai_layout",
      content: {
        elements: [{ type: "text", text: "Safe", appearance: { style: "color:red" } }]
      }
    }),
    /Unsafe AI layout key/
  );
});
