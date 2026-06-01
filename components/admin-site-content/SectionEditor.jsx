"use client";

import { useMemo, useState } from "react";
import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";
import sectionSettingControls from "@/lib/section-setting-controls.cjs";
import { Field, RowEditor, TextInput } from "./EditorControls";
import { SectionImageUpload } from "./SectionImageUpload";

const {
  getLayoutControlsForSection,
  getStyleControlsForSection,
  patchSectionLayoutToken,
  patchSectionStyleToken,
  sanitizeAnchorId
} = sectionSettingControls;

const VARIANT_OPTIONS = {
  hero: [
    ["split", "split"],
    ["simple", "simple"]
  ],
  card_grid: [
    ["four", "four"],
    ["three", "three"]
  ],
  capability_matrix: [
    ["three", "three"],
    ["four", "four"]
  ],
  media_feature: [
    ["image-right", "imageRight"],
    ["image-only", "imageOnly"]
  ],
  support_entry: [
    ["four", "four"],
    ["three", "three"]
  ]
};

function getSectionTitle(section, labels) {
  return labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type] || section.type;
}

function tokenLabel(labels, value) {
  return labels.settingTokenValues?.[String(value)] || value;
}

function controlLabel(labels, key) {
  return labels.settingControlLabels?.[key] || labels[key] || key;
}

function SelectField({ label, value, options, labels, onChange, labelGroup = "" }) {
  return (
    <Field label={label}>
      <select value={value || options[0]?.[0] || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelKey]) => (
          <option key={optionValue} value={optionValue}>
            {labelGroup === "tokens"
              ? tokenLabel(labels, labelKey)
              : labels.variants?.[labelKey] || labels.tones?.[labelKey] || optionValue}
          </option>
        ))}
      </select>
    </Field>
  );
}

function tokenOptions(values) {
  return [["", "inherit"], ...values.map((value) => [String(value), String(value)])];
}

function TokenSelect({ labels, label, value, values, onChange }) {
  return (
    <SelectField
      label={label}
      value={value === undefined || value === null ? "" : String(value)}
      labels={labels}
      options={tokenOptions(values)}
      labelGroup="tokens"
      onChange={onChange}
    />
  );
}

function CtaFields({ labels, contentValues, section, onPatchSectionContent }) {
  return (
    <div className="form-grid two">
      <Field label={labels.primaryCta}>
        <TextInput value={contentValues.primaryCta} onChange={(value) => onPatchSectionContent(section.id, "primaryCta", value)} />
      </Field>
      <Field label={labels.primaryHref}>
        <TextInput value={contentValues.primaryHref} onChange={(value) => onPatchSectionContent(section.id, "primaryHref", value)} />
      </Field>
      <Field label={labels.secondaryCta}>
        <TextInput value={contentValues.secondaryCta} onChange={(value) => onPatchSectionContent(section.id, "secondaryCta", value)} />
      </Field>
      <Field label={labels.secondaryHref}>
        <TextInput value={contentValues.secondaryHref} onChange={(value) => onPatchSectionContent(section.id, "secondaryHref", value)} />
      </Field>
    </div>
  );
}

function TextFields({ labels, contentValues, section, fields, onPatchSectionContent }) {
  return fields.map((field) => (
    <Field label={labels[field.label] || field.label} key={field.key}>
      <TextInput
        multiline={field.multiline}
        value={contentValues[field.key]}
        onChange={(value) => onPatchSectionContent(section.id, field.key, value)}
      />
    </Field>
  ));
}

function patchAiLayoutElement(section, elementId, updater) {
  const elements = Array.isArray(section.content?.elements) ? section.content.elements : [];
  return {
    ...section,
    content: {
      ...(section.content || {}),
      elements: elements.map((element) => (
        element.id === elementId ? updater(element) : element
      ))
    }
  };
}

function formatElementPosition(element) {
  const box = element.box || {};
  const parts = ["x", "y", "width", "height"].map((key) => {
    const value = Number(box[key] || 0);
    return `${key}: ${Math.round(value * 100)}%`;
  });
  return parts.join(" / ");
}

const AI_LAYOUT_GROUPS = [
  { key: "copy", roles: ["eyebrow", "headline", "body"], types: ["text", "badge"] },
  { key: "actions", roles: ["cta"], types: ["button"] },
  { key: "media", roles: ["media"], types: ["image", "icon"] },
  { key: "structure", roles: ["card", "decorative"], types: ["card"] }
];

function aiLayoutRole(element = {}) {
  if (element.role) return element.role;
  if (element.type === "badge") return "eyebrow";
  if (element.type === "button") return "cta";
  if (element.type === "image") return "media";
  if (element.type === "card") return "card";
  if (element.type === "icon") return "decorative";
  return "body";
}

function aiLayoutRoleLabel(labels, role, type) {
  return labels.aiLayoutRoles?.[role] || labels.aiLayoutElementTypes?.[type] || role || type;
}

function aiLayoutFieldLabel(labels, element = {}) {
  const role = aiLayoutRole(element);
  if (labels.aiLayoutFieldLabels?.[role]) return labels.aiLayoutFieldLabels[role];
  if (element.type === "button") return labels.primaryCta;
  if (element.type === "image") return labels.heroAlt;
  return labels.title;
}

function aiLayoutGroupLabel(labels, groupKey) {
  return labels.aiLayoutGroups?.[groupKey] || labels.aiLayoutElements;
}

function AiLayoutPositionDetails({ element, labels }) {
  const box = element.box || {};
  const positionRows = ["x", "y", "width", "height"].map((key) => {
    const value = Number(box[key] || 0);
    return [key, `${Math.round(value * 100)}%`];
  });

  return (
    <details className="ai-layout-element-position">
      <summary>{labels.aiLayoutPosition || "Position"}</summary>
      <dl>
        {positionRows.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>{formatElementPosition(element)}</p>
    </details>
  );
}

function AiLayoutContentTab({ section, labels, onPatchSection, onOpenAssetPicker }) {
  const elements = Array.isArray(section.content?.elements) ? section.content.elements : [];

  if (!elements.length) {
    return <p className="muted-line">{labels.aiLayoutNoElements}</p>;
  }

  function patchElement(elementId, updater) {
    onPatchSection(section.id, (current) => patchAiLayoutElement(current, elementId, updater));
  }

  const indexedElements = elements.map((element, index) => ({
    element,
    index,
    role: aiLayoutRole(element)
  }));
  const groupedElements = AI_LAYOUT_GROUPS.map((group) => ({
    ...group,
    items: indexedElements.filter(({ element, role }) => group.roles.includes(role) || group.types.includes(element.type))
  })).filter((group) => group.items.length);
  const groupedIds = new Set(groupedElements.flatMap((group) => group.items.map(({ index }) => index)));
  const ungroupedElements = indexedElements.filter(({ index }) => !groupedIds.has(index));

  return (
    <div className="ai-layout-element-list">
      <p className="muted-line">{labels.aiLayoutElements}</p>
      {[...groupedElements, ...(ungroupedElements.length ? [{ key: "other", items: ungroupedElements }] : [])].map((group) => (
        <section className="ai-layout-element-group" key={group.key}>
          <h4>{aiLayoutGroupLabel(labels, group.key)}</h4>
          {group.items.map(({ element, index, role }) => {
            const typeLabel = labels.aiLayoutElementTypes?.[element.type] || element.type;
            const roleLabel = aiLayoutRoleLabel(labels, role, element.type);
            const title = `${index + 1}. ${roleLabel}`;
            const multiline = role === "body" || element.type === "card" || (element.type === "text" && String(element.text || "").length > 80);
            return (
              <details className="ai-layout-element-editor" key={element.id || `${element.type}-${index}`} open>
                <summary className="ai-layout-element-summary">
                  <span>
                    <strong>{title}</strong>
                    <small>{typeLabel}</small>
                  </span>
                  <em>{role}</em>
                </summary>
                {["text", "button", "badge", "card"].includes(element.type) ? (
                  <Field label={aiLayoutFieldLabel(labels, element)}>
                    <TextInput
                      multiline={multiline}
                      value={element.text}
                      onChange={(value) => patchElement(element.id, (current) => ({ ...current, text: value }))}
                    />
                  </Field>
                ) : null}
                {element.type === "button" ? (
                  <Field label={labels.primaryHref}>
                    <TextInput value={element.href} onChange={(value) => patchElement(element.id, (current) => ({ ...current, href: value }))} />
                  </Field>
                ) : null}
                {element.type === "icon" ? (
                  <div className="form-grid two">
                    <Field label={labels.icon}>
                      <TextInput value={element.icon} onChange={(value) => patchElement(element.id, (current) => ({ ...current, icon: value }))} />
                    </Field>
                    <Field label={labels.ariaLabel}>
                      <TextInput value={element.label} onChange={(value) => patchElement(element.id, (current) => ({ ...current, label: value }))} />
                    </Field>
                  </div>
                ) : null}
                {element.type === "image" ? (
                  <div className="ai-layout-image-editor">
                    <Field label={aiLayoutFieldLabel(labels, element)}>
                      <TextInput value={element.alt} onChange={(value) => patchElement(element.id, (current) => ({ ...current, alt: value }))} />
                    </Field>
                    {element.imageUrl ? <img className="cms-image-preview" src={element.imageUrl} alt={element.alt || labels.heroImage} /> : <p className="muted-line">{labels.noImage}</p>}
                    <button
                      className="button secondary compact"
                      type="button"
                      onClick={() => onOpenAssetPicker?.(section.id, "imagePath", "imageUrl", { aiLayoutElementId: element.id })}
                    >
                      {labels.chooseImage}
                    </button>
                  </div>
                ) : null}
                <AiLayoutPositionDetails element={element} labels={labels} />
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function ContentTab({ section, labels, defaultTargetSize, onPatchSection, onPatchSectionContent, onOpenAssetPicker }) {
  const contentValues = section.content || {};
  const commonText = [
    { key: "eyebrow", label: "eyebrow" },
    { key: "title", label: "title" },
    { key: "lead", label: "lead", multiline: true }
  ];

  if (section.type === "ai_layout") {
    return <AiLayoutContentTab section={section} labels={labels} onPatchSection={onPatchSection} onOpenAssetPicker={onOpenAssetPicker} />;
  }

  if (section.type === "hero") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
        <CtaFields labels={labels} contentValues={contentValues} section={section} onPatchSectionContent={onPatchSectionContent} />
        <Field label={labels.heroAlt}>
          <TextInput value={contentValues.heroAlt} onChange={(value) => onPatchSectionContent(section.id, "heroAlt", value)} />
        </Field>
        <SectionImageUpload section={section} pathKey="heroImagePath" urlKey="heroImageUrl" label={labels.heroImage} labels={labels} defaultTargetSize={defaultTargetSize} onPatchSection={onPatchSection} onOpenAssetPicker={onOpenAssetPicker} />
      </>
    );
  }

  if (section.type === "trust_bar") {
    return (
      <>
        <Field label={labels.ariaLabel}>
          <TextInput value={contentValues.ariaLabel} onChange={(value) => onPatchSectionContent(section.id, "ariaLabel", value)} />
        </Field>
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.value, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "card_grid" || section.type === "capability_matrix") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.icon, labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "feature_list") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "media_feature") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
        <Field label={labels.heroAlt}>
          <TextInput value={contentValues.imageAlt} onChange={(value) => onPatchSectionContent(section.id, "imageAlt", value)} />
        </Field>
        <SectionImageUpload section={section} pathKey="imagePath" urlKey="imageUrl" label={labels.heroImage} labels={labels} defaultTargetSize={defaultTargetSize} onPatchSection={onPatchSection} onOpenAssetPicker={onOpenAssetPicker} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "scenario_split") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.scenarioTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "workflow_steps") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.step, labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "module_showcase") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.moduleName, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "security_assurance") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.assuranceName, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "download_panel") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
        <CtaFields labels={labels} contentValues={contentValues} section={section} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.clientName, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "faq_band") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.question, labels.answer]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "support_entry") {
    return (
      <>
        <TextFields labels={labels} contentValues={contentValues} section={section} fields={[{ key: "title", label: "title" }, { key: "lead", label: "lead", multiline: true }]} onPatchSectionContent={onPatchSectionContent} />
        <RowEditor labels={labels} rows={contentValues.items} columns={5} placeholders={[labels.icon, labels.itemTitle, labels.description, labels.actionHref, labels.defaultRequestType]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  if (section.type === "updates_list") {
    return (
      <>
        <Field label={labels.title}>
          <TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} />
        </Field>
        <div className="form-grid two">
          <Field label={labels.actionLabel}>
            <TextInput value={contentValues.actionLabel} onChange={(value) => onPatchSectionContent(section.id, "actionLabel", value)} />
          </Field>
          <Field label={labels.actionHref}>
            <TextInput value={contentValues.actionHref} onChange={(value) => onPatchSectionContent(section.id, "actionHref", value)} />
          </Field>
        </div>
        <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.itemTitle, labels.description, labels.pill]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
      </>
    );
  }

  return (
    <>
      <TextFields labels={labels} contentValues={contentValues} section={section} fields={commonText} onPatchSectionContent={onPatchSectionContent} />
      <CtaFields labels={labels} contentValues={contentValues} section={section} onPatchSectionContent={onPatchSectionContent} />
    </>
  );
}

function StyleTab({ section, labels, onPatchSection }) {
  const controls = getStyleControlsForSection(section.type);
  const styleValues = section.settings?.style || {};

  if (!controls.length) {
    return <p className="muted-line">{labels.noStyleSettings}</p>;
  }

  return (
    <>
      <SelectField
        label={labels.sectionTone}
        value={section.settings?.tone || "plain"}
        labels={labels}
        options={[
          ["plain", "plain"],
          ["alt", "alt"]
        ]}
        onChange={(value) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: value } }))}
      />
      {controls.includes("textSize") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "textSize")} value={styleValues.textSize} values={["small", "medium", "large"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "textSize", value))} />
      ) : null}
      {controls.includes("titleWeight") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "titleWeight")} value={styleValues.titleWeight} values={["500", "600", "700", "800"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "titleWeight", value))} />
      ) : null}
      {controls.includes("cardStyle") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "cardStyle")} value={styleValues.cardStyle} values={["flat", "outlined", "shadow"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "cardStyle", value))} />
      ) : null}
      {controls.includes("iconStyle") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "iconStyle")} value={styleValues.iconStyle} values={["line", "filled"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "iconStyle", value))} />
      ) : null}
      {controls.includes("buttonStyle") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "buttonStyle")} value={styleValues.buttonStyle} values={["solid", "outline"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "buttonStyle", value))} />
      ) : null}
      {controls.includes("colorScheme") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "colorScheme")} value={styleValues.colorScheme} values={["default", "brand", "blue", "green", "neutral"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "colorScheme", value))} />
      ) : null}
      {controls.includes("imageRadius") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "imageRadius")} value={styleValues.imageRadius} values={["none", "small", "medium", "large"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "imageRadius", value))} />
      ) : null}
      {controls.includes("cardSpacing") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "cardSpacing")} value={styleValues.cardSpacing} values={["compact", "normal", "relaxed"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionStyleToken(current, "cardSpacing", value))} />
      ) : null}
    </>
  );
}

function LayoutTab({ section, labels, onPatchSection }) {
  const controls = getLayoutControlsForSection(section.type);
  const layoutValues = section.settings?.layout || {};
  const options = VARIANT_OPTIONS[section.type];
  const hasAnchor = section.type === "support_entry";

  if (!options && !controls.length && !hasAnchor) {
    return <p className="muted-line">{labels.noLayoutSettings}</p>;
  }

  return (
    <>
      {options ? (
        <SelectField
          label={labels.variant}
          value={section.variant}
          labels={labels}
          options={options}
          onChange={(value) => onPatchSection(section.id, (current) => ({ ...current, variant: value }))}
        />
      ) : null}
      {controls.includes("desktopArrangement") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "desktopArrangement")} value={layoutValues.desktopArrangement} values={["split", "stacked", "overlay", "background"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "desktopArrangement", value))} />
      ) : null}
      {controls.includes("mobileArrangement") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "mobileArrangement")} value={layoutValues.mobileArrangement} values={["single-column", "image-top", "image-bottom"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "mobileArrangement", value))} />
      ) : null}
      {controls.includes("cardColumns") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "cardColumns")} value={layoutValues.cardColumns} values={[1, 2, 3, 4]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "cardColumns", Number(value) || ""))} />
      ) : null}
      {controls.includes("contentAlign") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "contentAlign")} value={layoutValues.contentAlign} values={["left", "center"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "contentAlign", value))} />
      ) : null}
      {controls.includes("imagePosition") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "imagePosition")} value={layoutValues.imagePosition} values={["left", "right", "top", "background"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "imagePosition", value))} />
      ) : null}
      {controls.includes("entranceAnimation") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "entranceAnimation")} value={layoutValues.entranceAnimation} values={["none", "fade", "fade-up", "stagger"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "entranceAnimation", value))} />
      ) : null}
      {controls.includes("hoverIn") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "hoverIn")} value={layoutValues.hoverIn} values={["none", "lift", "reveal"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "hoverIn", value))} />
      ) : null}
      {controls.includes("hoverOut") ? (
        <TokenSelect labels={labels} label={controlLabel(labels, "hoverOut")} value={layoutValues.hoverOut} values={["none", "reset", "fade"]} onChange={(value) => onPatchSection(section.id, (current) => patchSectionLayoutToken(current, "hoverOut", value))} />
      ) : null}
      {hasAnchor ? (
        <Field label={labels.anchorId}>
          <TextInput value={section.settings?.anchorId} onChange={(value) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), anchorId: sanitizeAnchorId(value) } }))} />
        </Field>
      ) : null}
    </>
  );
}

export function SectionEditor({ section, labels, defaultTargetSize = "1024x1024", onPatchSection, onPatchSectionContent, onOpenAssetPicker }) {
  const tabs = useMemo(() => [
    ["content", labels.settingTabs?.content || labels.inspector],
    ["style", labels.settingTabs?.style || labels.sectionTone],
    ["layout", labels.settingTabs?.layout || labels.variant]
  ], [labels]);
  const [activeTab, setActiveTab] = useState("content");

  if (!section) {
    return <article className="builder-empty">{labels.noSectionSelected}</article>;
  }

  return (
    <div className="builder-inspector">
      <div className="builder-inspector-head">
        <p className="eyebrow">{labels.inspector}</p>
        <h3>{getSectionTitle(section, labels)}</h3>
      </div>
      <div className="builder-setting-tabs" role="tablist" aria-label={labels.inspector}>
        {tabs.map(([key, label]) => (
          <button
            className={activeTab === key ? "active" : ""}
            type="button"
            key={key}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {activeTab === "content" ? (
          <ContentTab section={section} labels={labels} defaultTargetSize={defaultTargetSize} onPatchSection={onPatchSection} onPatchSectionContent={onPatchSectionContent} onOpenAssetPicker={onOpenAssetPicker} />
      ) : null}
      {activeTab === "style" ? <StyleTab section={section} labels={labels} onPatchSection={onPatchSection} /> : null}
      {activeTab === "layout" ? <LayoutTab section={section} labels={labels} onPatchSection={onPatchSection} /> : null}
    </div>
  );
}
