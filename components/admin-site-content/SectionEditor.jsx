"use client";

import { useMemo, useState } from "react";
import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";
import { Field, RowEditor, TextInput } from "./EditorControls";
import { SectionImageUpload } from "./SectionImageUpload";

const STYLE_TYPES = new Set([
  "card_grid",
  "feature_list",
  "capability_matrix",
  "scenario_split",
  "workflow_steps",
  "module_showcase",
  "security_assurance",
  "download_panel",
  "faq_band",
  "support_entry",
  "updates_list",
  "cta_band"
]);

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

function SelectField({ label, value, options, labels, onChange }) {
  return (
    <Field label={label}>
      <select value={value || options[0]?.[0] || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelKey]) => (
          <option key={optionValue} value={optionValue}>
            {labels.variants?.[labelKey] || labels.tones?.[labelKey] || optionValue}
          </option>
        ))}
      </select>
    </Field>
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

function ContentTab({ section, labels, defaultTargetSize, onPatchSection, onPatchSectionContent, onOpenAssetPicker }) {
  const contentValues = section.content || {};
  const commonText = [
    { key: "eyebrow", label: "eyebrow" },
    { key: "title", label: "title" },
    { key: "lead", label: "lead", multiline: true }
  ];

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
    return <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.value, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />;
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
  if (!STYLE_TYPES.has(section.type)) {
    return <p className="muted-line">{labels.noStyleSettings}</p>;
  }

  return (
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
  );
}

function LayoutTab({ section, labels, onPatchSection }) {
  const options = VARIANT_OPTIONS[section.type];
  if (!options) {
    return <p className="muted-line">{labels.noLayoutSettings}</p>;
  }

  return (
    <SelectField
      label={labels.variant}
      value={section.variant}
      labels={labels}
      options={options}
      onChange={(value) => onPatchSection(section.id, (current) => ({ ...current, variant: value }))}
    />
  );
}

function AdvancedTab({ section, labels, onPatchSection, onPatchSectionContent }) {
  const contentValues = section.content || {};
  const hasAnchor = section.type === "support_entry";
  const hasAria = section.type === "trust_bar";

  if (!hasAnchor && !hasAria) {
    return <p className="muted-line">{labels.noAdvancedSettings}</p>;
  }

  return (
    <>
      {hasAnchor ? (
        <Field label={labels.anchorId}>
          <TextInput value={section.settings?.anchorId} onChange={(value) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), anchorId: value } }))} />
        </Field>
      ) : null}
      {hasAria ? (
        <Field label={labels.ariaLabel}>
          <TextInput value={contentValues.ariaLabel} onChange={(value) => onPatchSectionContent(section.id, "ariaLabel", value)} />
        </Field>
      ) : null}
    </>
  );
}

export function SectionEditor({ section, labels, defaultTargetSize = "1024x1024", onPatchSection, onPatchSectionContent, onOpenAssetPicker }) {
  const tabs = useMemo(() => [
    ["content", labels.settingTabs?.content || labels.inspector],
    ["style", labels.settingTabs?.style || labels.sectionTone],
    ["layout", labels.settingTabs?.layout || labels.variant],
    ["advanced", labels.settingTabs?.advanced || labels.anchorId]
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
      {activeTab === "advanced" ? <AdvancedTab section={section} labels={labels} onPatchSection={onPatchSection} onPatchSectionContent={onPatchSectionContent} /> : null}
    </div>
  );
}
