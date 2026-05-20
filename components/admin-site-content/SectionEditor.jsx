import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";
import { Field, RowEditor, TextInput } from "./EditorControls";
import { SectionImageUpload } from "./SectionImageUpload";

export function SectionEditor({ section, labels, uploadingSectionId, onPatchSection, onPatchSectionContent, onUploadImage }) {
  if (!section) {
    return <article className="builder-empty">{labels.noSectionSelected}</article>;
  }

  const contentValues = section.content || {};
  const commonTitle = labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type] || section.type;

  return (
    <div className="builder-inspector">
      <div className="builder-inspector-head">
        <p className="eyebrow">{labels.inspector}</p>
        <h3>{commonTitle}</h3>
      </div>

      {section.type === "hero" ? (
        <>
          <Field label={labels.variant}>
            <select value={section.variant || "split"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
              <option value="split">{labels.variants?.split}</option>
              <option value="simple">{labels.variants?.simple}</option>
            </select>
          </Field>
          <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => onPatchSectionContent(section.id, "eyebrow", value)} /></Field>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => onPatchSectionContent(section.id, "lead", value)} /></Field>
          <div className="form-grid two">
            <Field label={labels.primaryCta}><TextInput value={contentValues.primaryCta} onChange={(value) => onPatchSectionContent(section.id, "primaryCta", value)} /></Field>
            <Field label={labels.primaryHref}><TextInput value={contentValues.primaryHref} onChange={(value) => onPatchSectionContent(section.id, "primaryHref", value)} /></Field>
            <Field label={labels.secondaryCta}><TextInput value={contentValues.secondaryCta} onChange={(value) => onPatchSectionContent(section.id, "secondaryCta", value)} /></Field>
            <Field label={labels.secondaryHref}><TextInput value={contentValues.secondaryHref} onChange={(value) => onPatchSectionContent(section.id, "secondaryHref", value)} /></Field>
          </div>
          <Field label={labels.heroAlt}><TextInput value={contentValues.heroAlt} onChange={(value) => onPatchSectionContent(section.id, "heroAlt", value)} /></Field>
          <SectionImageUpload section={section} pathKey="heroImagePath" urlKey="heroImageUrl" label={labels.heroImage} labels={labels} uploadingSectionId={uploadingSectionId} onUploadImage={onUploadImage} />
        </>
      ) : null}

      {section.type === "trust_bar" ? (
        <>
          <Field label={labels.ariaLabel}><TextInput value={contentValues.ariaLabel} onChange={(value) => onPatchSectionContent(section.id, "ariaLabel", value)} /></Field>
          <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.value, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
        </>
      ) : null}

      {section.type === "card_grid" || section.type === "capability_matrix" ? (
        <>
          <div className="form-grid two">
            <Field label={labels.variant}>
              <select value={section.variant || "four"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
                <option value="four">{labels.variants?.four}</option>
                <option value="three">{labels.variants?.three}</option>
              </select>
            </Field>
            <Field label={labels.sectionTone}>
              <select value={section.settings?.tone || "plain"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
                <option value="plain">{labels.tones?.plain}</option>
                <option value="alt">{labels.tones?.alt}</option>
              </select>
            </Field>
          </div>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => onPatchSectionContent(section.id, "lead", value)} /></Field>
          <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.icon, labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
        </>
      ) : null}

      {section.type === "feature_list" ? (
        <>
          <Field label={labels.sectionTone}>
            <select value={section.settings?.tone || "plain"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
              <option value="plain">{labels.tones?.plain}</option>
              <option value="alt">{labels.tones?.alt}</option>
            </select>
          </Field>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => onPatchSectionContent(section.id, "lead", value)} /></Field>
          <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
        </>
      ) : null}

      {section.type === "media_feature" ? (
        <>
          <Field label={labels.variant}>
            <select value={section.variant || "image-right"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
              <option value="image-right">{labels.variants?.imageRight}</option>
              <option value="image-only">{labels.variants?.imageOnly}</option>
            </select>
          </Field>
          <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => onPatchSectionContent(section.id, "eyebrow", value)} /></Field>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => onPatchSectionContent(section.id, "lead", value)} /></Field>
          <Field label={labels.heroAlt}><TextInput value={contentValues.imageAlt} onChange={(value) => onPatchSectionContent(section.id, "imageAlt", value)} /></Field>
          <SectionImageUpload section={section} pathKey="imagePath" urlKey="imageUrl" label={labels.heroImage} labels={labels} uploadingSectionId={uploadingSectionId} onUploadImage={onUploadImage} />
          <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
        </>
      ) : null}

      {section.type === "updates_list" ? (
        <>
          <Field label={labels.sectionTone}>
            <select value={section.settings?.tone || "alt"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
              <option value="plain">{labels.tones?.plain}</option>
              <option value="alt">{labels.tones?.alt}</option>
            </select>
          </Field>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <div className="form-grid two">
            <Field label={labels.actionLabel}><TextInput value={contentValues.actionLabel} onChange={(value) => onPatchSectionContent(section.id, "actionLabel", value)} /></Field>
            <Field label={labels.actionHref}><TextInput value={contentValues.actionHref} onChange={(value) => onPatchSectionContent(section.id, "actionHref", value)} /></Field>
          </div>
          <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.itemTitle, labels.description, labels.pill]} onChange={(rows) => onPatchSectionContent(section.id, "items", rows)} />
        </>
      ) : null}

      {section.type === "cta_band" ? (
        <>
          <Field label={labels.sectionTone}>
            <select value={section.settings?.tone || "plain"} onChange={(event) => onPatchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
              <option value="plain">{labels.tones?.plain}</option>
              <option value="alt">{labels.tones?.alt}</option>
            </select>
          </Field>
          <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => onPatchSectionContent(section.id, "eyebrow", value)} /></Field>
          <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => onPatchSectionContent(section.id, "title", value)} /></Field>
          <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => onPatchSectionContent(section.id, "lead", value)} /></Field>
          <div className="form-grid two">
            <Field label={labels.primaryCta}><TextInput value={contentValues.primaryCta} onChange={(value) => onPatchSectionContent(section.id, "primaryCta", value)} /></Field>
            <Field label={labels.primaryHref}><TextInput value={contentValues.primaryHref} onChange={(value) => onPatchSectionContent(section.id, "primaryHref", value)} /></Field>
            <Field label={labels.secondaryCta}><TextInput value={contentValues.secondaryCta} onChange={(value) => onPatchSectionContent(section.id, "secondaryCta", value)} /></Field>
            <Field label={labels.secondaryHref}><TextInput value={contentValues.secondaryHref} onChange={(value) => onPatchSectionContent(section.id, "secondaryHref", value)} /></Field>
          </div>
        </>
      ) : null}
    </div>
  );
}
