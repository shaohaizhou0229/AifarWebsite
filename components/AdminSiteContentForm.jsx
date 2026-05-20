"use client";

import { useMemo, useState } from "react";
import {
  SITE_LAYOUT_VERSION,
  SITE_SECTION_LABELS,
  SITE_SECTION_TYPES,
  createBlankSection,
  createSitePageTemplate
} from "@/lib/site-page-builder";

const EMPTY_ENTRY = {
  isPublished: false,
  publishedAt: null,
  updatedAt: null
};

const TEMPLATE_KEYS = ["home-current", "product-current", "conversion"];

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content || {}));
}

function ensureLayout(content) {
  return {
    ...cloneContent(content),
    layoutVersion: SITE_LAYOUT_VERSION,
    sections: Array.isArray(content?.sections) ? content.sections : []
  };
}

function updateSeo(content, key, value) {
  return {
    ...content,
    seo: {
      ...(content.seo || {}),
      [key]: value
    }
  };
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function updateSectionAt(sections, sectionId, updater) {
  return sections.map((section) => (section.id === sectionId ? updater(section) : section));
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function normalizeRows(value, columns) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => {
    const next = Array.isArray(row) ? [...row] : [];
    while (next.length < columns) next.push("");
    return next.slice(0, columns);
  });
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, multiline = false }) {
  if (multiline) {
    return <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }
  return <input value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

function RowEditor({ labels, rows, columns, placeholders, onChange }) {
  const safeRows = normalizeRows(rows, columns);

  function updateCell(rowIndex, cellIndex, value) {
    const next = safeRows.map((row) => [...row]);
    next[rowIndex][cellIndex] = value;
    onChange(next);
  }

  function addRow() {
    onChange([...safeRows, Array.from({ length: columns }, () => "")]);
  }

  function removeRow(rowIndex) {
    onChange(safeRows.filter((_, index) => index !== rowIndex));
  }

  return (
    <div className="builder-row-editor">
      {safeRows.map((row, rowIndex) => (
        <div className={`builder-row columns-${columns}`} key={`row-${rowIndex}`}>
          {row.map((cell, cellIndex) => (
            <input
              key={`cell-${cellIndex}`}
              value={cell || ""}
              aria-label={placeholders[cellIndex]}
              placeholder={placeholders[cellIndex]}
              onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
            />
          ))}
          <button className="icon-button danger" type="button" onClick={() => removeRow(rowIndex)} title={labels.removeItem}>
            -
          </button>
        </div>
      ))}
      <button className="button secondary compact" type="button" onClick={addRow}>{labels.addItem}</button>
    </div>
  );
}

export function AdminSiteContentForm({
  labels,
  initialPageKey,
  initialLocale,
  initialContent,
  initialEntry,
  pageOptions,
  localeOptions
}) {
  const [pageKey, setPageKey] = useState(initialPageKey);
  const [locale, setLocale] = useState(initialLocale);
  const [content, setContent] = useState(() => ensureLayout(initialContent));
  const [entry, setEntry] = useState(initialEntry || EMPTY_ENTRY);
  const [selectedSectionId, setSelectedSectionId] = useState(() => initialContent?.sections?.[0]?.id || "");
  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingSectionId, setUploadingSectionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentPage = useMemo(
    () => pageOptions.find((option) => option.key === pageKey) || pageOptions[0],
    [pageKey, pageOptions]
  );
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0] || null;

  async function loadContent(nextPageKey, nextLocale) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/site-content/?page=${encodeURIComponent(nextPageKey)}&locale=${encodeURIComponent(nextLocale)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.loadFailed);
      }

      const nextContent = ensureLayout(data.content);
      setPageKey(nextPageKey);
      setLocale(nextLocale);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setSelectedSectionId(nextContent.sections[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message || labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/site-content/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale, content: ensureLayout(content) })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.saveFailed);
      }

      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setSelectedSectionId((current) => current || nextContent.sections[0]?.id || "");
      setMessage(labels.saved);
    } catch (saveError) {
      setError(saveError.message || labels.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    setPublishing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/site-content/publish/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.publishFailed);
      }

      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setMessage(labels.published);
    } catch (publishError) {
      setError(publishError.message || labels.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  async function uploadImage(event, sectionId, pathKey, urlKey) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSectionId(sectionId);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.set("pageKey", pageKey);
      formData.set("locale", locale);
      formData.set("file", file);

      const response = await fetch("/api/admin/site-content/image/", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.uploadFailed);
      }

      patchSection(sectionId, (section) => ({
        ...section,
        content: {
          ...(section.content || {}),
          [pathKey]: data.storagePath,
          [urlKey]: data.url
        }
      }));
      setMessage(labels.uploaded);
    } catch (uploadError) {
      setError(uploadError.message || labels.uploadFailed);
    } finally {
      setUploadingSectionId("");
      event.target.value = "";
    }
  }

  function patchSection(sectionId, updater) {
    setContent((current) => ({
      ...current,
      layoutVersion: SITE_LAYOUT_VERSION,
      sections: updateSectionAt(current.sections || [], sectionId, updater)
    }));
  }

  function patchSectionContent(sectionId, key, value) {
    patchSection(sectionId, (section) => ({
      ...section,
      content: {
        ...(section.content || {}),
        [key]: value
      }
    }));
  }

  function applyTemplate(templateKey) {
    const template = createSitePageTemplate(templateKey, pageKey, content);
    setContent(ensureLayout({
      ...template,
      seo: content.seo || template.seo
    }));
    setSelectedSectionId(template.sections[0]?.id || "");
    setMessage(labels.templateApplied);
    setError("");
  }

  function addSection(type) {
    const section = createBlankSection(type);
    setContent((current) => ({
      ...current,
      layoutVersion: SITE_LAYOUT_VERSION,
      sections: [...(current.sections || []), section]
    }));
    setSelectedSectionId(section.id);
  }

  function removeSection(sectionId) {
    const nextSections = sections.filter((section) => section.id !== sectionId);
    setContent((current) => ({ ...current, sections: nextSections }));
    setSelectedSectionId(nextSections[0]?.id || "");
  }

  function moveSection(fromIndex, toIndex) {
    const nextSections = moveItem(sections, fromIndex, toIndex);
    setContent((current) => ({ ...current, sections: nextSections }));
  }

  function onDropSection(toIndex) {
    if (dragIndex === null) return;
    moveSection(dragIndex, toIndex);
    setDragIndex(null);
  }

  function renderImageUpload(section, pathKey, urlKey, label) {
    const inputId = `${section.id}-${pathKey}`;
    const imageUrl = section.content?.[urlKey] || "";
    return (
      <section className="builder-image-field">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="muted-line">{section.content?.[pathKey] || labels.noImage}</p>
        </div>
        {imageUrl ? <img className="cms-image-preview" src={imageUrl} alt={section.content?.heroAlt || section.content?.imageAlt || label} /> : null}
        <div className="upload-picker">
          <input id={inputId} className="file-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => uploadImage(event, section.id, pathKey, urlKey)} />
          <label className="button secondary compact" htmlFor={inputId}>
            {uploadingSectionId === section.id ? labels.uploading : labels.chooseImage}
          </label>
        </div>
      </section>
    );
  }

  function renderSectionEditor(section) {
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
              <select value={section.variant || "split"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
                <option value="split">{labels.variants?.split}</option>
                <option value="simple">{labels.variants?.simple}</option>
              </select>
            </Field>
            <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => patchSectionContent(section.id, "eyebrow", value)} /></Field>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => patchSectionContent(section.id, "lead", value)} /></Field>
            <div className="form-grid two">
              <Field label={labels.primaryCta}><TextInput value={contentValues.primaryCta} onChange={(value) => patchSectionContent(section.id, "primaryCta", value)} /></Field>
              <Field label={labels.primaryHref}><TextInput value={contentValues.primaryHref} onChange={(value) => patchSectionContent(section.id, "primaryHref", value)} /></Field>
              <Field label={labels.secondaryCta}><TextInput value={contentValues.secondaryCta} onChange={(value) => patchSectionContent(section.id, "secondaryCta", value)} /></Field>
              <Field label={labels.secondaryHref}><TextInput value={contentValues.secondaryHref} onChange={(value) => patchSectionContent(section.id, "secondaryHref", value)} /></Field>
            </div>
            <Field label={labels.heroAlt}><TextInput value={contentValues.heroAlt} onChange={(value) => patchSectionContent(section.id, "heroAlt", value)} /></Field>
            {renderImageUpload(section, "heroImagePath", "heroImageUrl", labels.heroImage)}
          </>
        ) : null}

        {section.type === "trust_bar" ? (
          <>
            <Field label={labels.ariaLabel}><TextInput value={contentValues.ariaLabel} onChange={(value) => patchSectionContent(section.id, "ariaLabel", value)} /></Field>
            <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.value, labels.description]} onChange={(rows) => patchSectionContent(section.id, "items", rows)} />
          </>
        ) : null}

        {section.type === "card_grid" || section.type === "capability_matrix" ? (
          <>
            <div className="form-grid two">
              <Field label={labels.variant}>
                <select value={section.variant || "four"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
                  <option value="four">{labels.variants?.four}</option>
                  <option value="three">{labels.variants?.three}</option>
                </select>
              </Field>
              <Field label={labels.sectionTone}>
                <select value={section.settings?.tone || "plain"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
                  <option value="plain">{labels.tones?.plain}</option>
                  <option value="alt">{labels.tones?.alt}</option>
                </select>
              </Field>
            </div>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => patchSectionContent(section.id, "lead", value)} /></Field>
            <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.icon, labels.itemTitle, labels.description]} onChange={(rows) => patchSectionContent(section.id, "items", rows)} />
          </>
        ) : null}

        {section.type === "feature_list" ? (
          <>
            <Field label={labels.sectionTone}>
              <select value={section.settings?.tone || "plain"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
                <option value="plain">{labels.tones?.plain}</option>
                <option value="alt">{labels.tones?.alt}</option>
              </select>
            </Field>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => patchSectionContent(section.id, "lead", value)} /></Field>
            <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => patchSectionContent(section.id, "items", rows)} />
          </>
        ) : null}

        {section.type === "media_feature" ? (
          <>
            <Field label={labels.variant}>
              <select value={section.variant || "image-right"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, variant: event.target.value }))}>
                <option value="image-right">{labels.variants?.imageRight}</option>
                <option value="image-only">{labels.variants?.imageOnly}</option>
              </select>
            </Field>
            <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => patchSectionContent(section.id, "eyebrow", value)} /></Field>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => patchSectionContent(section.id, "lead", value)} /></Field>
            <Field label={labels.heroAlt}><TextInput value={contentValues.imageAlt} onChange={(value) => patchSectionContent(section.id, "imageAlt", value)} /></Field>
            {renderImageUpload(section, "imagePath", "imageUrl", labels.heroImage)}
            <RowEditor labels={labels} rows={contentValues.items} columns={2} placeholders={[labels.itemTitle, labels.description]} onChange={(rows) => patchSectionContent(section.id, "items", rows)} />
          </>
        ) : null}

        {section.type === "updates_list" ? (
          <>
            <Field label={labels.sectionTone}>
              <select value={section.settings?.tone || "alt"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
                <option value="plain">{labels.tones?.plain}</option>
                <option value="alt">{labels.tones?.alt}</option>
              </select>
            </Field>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <div className="form-grid two">
              <Field label={labels.actionLabel}><TextInput value={contentValues.actionLabel} onChange={(value) => patchSectionContent(section.id, "actionLabel", value)} /></Field>
              <Field label={labels.actionHref}><TextInput value={contentValues.actionHref} onChange={(value) => patchSectionContent(section.id, "actionHref", value)} /></Field>
            </div>
            <RowEditor labels={labels} rows={contentValues.items} columns={3} placeholders={[labels.itemTitle, labels.description, labels.pill]} onChange={(rows) => patchSectionContent(section.id, "items", rows)} />
          </>
        ) : null}

        {section.type === "cta_band" ? (
          <>
            <Field label={labels.sectionTone}>
              <select value={section.settings?.tone || "plain"} onChange={(event) => patchSection(section.id, (current) => ({ ...current, settings: { ...(current.settings || {}), tone: event.target.value } }))}>
                <option value="plain">{labels.tones?.plain}</option>
                <option value="alt">{labels.tones?.alt}</option>
              </select>
            </Field>
            <Field label={labels.eyebrow}><TextInput value={contentValues.eyebrow} onChange={(value) => patchSectionContent(section.id, "eyebrow", value)} /></Field>
            <Field label={labels.title}><TextInput value={contentValues.title} onChange={(value) => patchSectionContent(section.id, "title", value)} /></Field>
            <Field label={labels.lead}><TextInput multiline value={contentValues.lead} onChange={(value) => patchSectionContent(section.id, "lead", value)} /></Field>
            <div className="form-grid two">
              <Field label={labels.primaryCta}><TextInput value={contentValues.primaryCta} onChange={(value) => patchSectionContent(section.id, "primaryCta", value)} /></Field>
              <Field label={labels.primaryHref}><TextInput value={contentValues.primaryHref} onChange={(value) => patchSectionContent(section.id, "primaryHref", value)} /></Field>
              <Field label={labels.secondaryCta}><TextInput value={contentValues.secondaryCta} onChange={(value) => patchSectionContent(section.id, "secondaryCta", value)} /></Field>
              <Field label={labels.secondaryHref}><TextInput value={contentValues.secondaryHref} onChange={(value) => patchSectionContent(section.id, "secondaryHref", value)} /></Field>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <form className="admin-actions site-content-form" onSubmit={saveDraft}>
      <div className="cms-toolbar">
        <div className="field">
          <label htmlFor="cmsPage">{labels.page}</label>
          <select
            id="cmsPage"
            value={pageKey}
            onChange={(event) => loadContent(event.target.value, locale)}
            disabled={loading || saving || publishing}
          >
            {pageOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cmsLocale">{labels.locale}</label>
          <select
            id="cmsLocale"
            value={locale}
            onChange={(event) => loadContent(pageKey, event.target.value)}
            disabled={loading || saving || publishing}
          >
            {localeOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="cms-status-panel">
        <div>
          <p className="eyebrow">{labels.status}</p>
          <h3>{currentPage.label}</h3>
          <p className="muted-line">
            {entry?.isPublished ? labels.publishedStatus : labels.draftStatus}
            {entry?.updatedAt ? ` | ${labels.updatedAt}: ${formatDate(entry.updatedAt, locale)}` : ""}
            {entry?.publishedAt ? ` | ${labels.publishedAt}: ${formatDate(entry.publishedAt, locale)}` : ""}
          </p>
        </div>
        <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
          {publishing ? labels.publishing : labels.publish}
        </button>
      </div>

      <section className="cms-editor-section">
        <p className="eyebrow">{labels.seo}</p>
        <div className="form-grid two">
          <Field label={labels.seoTitle}>
            <input value={content.seo?.title || ""} onChange={(event) => setContent((current) => updateSeo(current, "title", event.target.value))} />
          </Field>
          <Field label={labels.seoDescription}>
            <input value={content.seo?.description || ""} onChange={(event) => setContent((current) => updateSeo(current, "description", event.target.value))} />
          </Field>
        </div>
      </section>

      <section className="builder-shell">
        <aside className="builder-panel">
          <p className="eyebrow">{labels.templates}</p>
          <div className="builder-button-list">
            {TEMPLATE_KEYS.map((templateKey) => (
              <button className="button secondary compact" type="button" key={templateKey} onClick={() => applyTemplate(templateKey)}>
                {labels.templateNames?.[templateKey] || templateKey}
              </button>
            ))}
          </div>
          <p className="eyebrow">{labels.addSection}</p>
          <div className="builder-button-list">
            {SITE_SECTION_TYPES.map((type) => (
              <button className="button secondary compact" type="button" key={type} onClick={() => addSection(type)}>
                {labels.sectionTypes?.[type] || SITE_SECTION_LABELS[type]}
              </button>
            ))}
          </div>
        </aside>

        <section className="builder-panel builder-list-panel">
          <div className="builder-panel-head">
            <p className="eyebrow">{labels.sections}</p>
            <span>{sections.length}</span>
          </div>
          <div className="builder-section-list">
            {sections.map((section, index) => (
              <article
                className={`builder-section-card${section.id === selectedSection?.id ? " active" : ""}`}
                key={section.id}
                draggable
                onClick={() => setSelectedSectionId(section.id)}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropSection(index)}
              >
                <span className="drag-handle" aria-hidden="true">::</span>
                <span>
                  <strong>{labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type]}</strong>
                  <small>{section.content?.title || section.content?.eyebrow || section.id}</small>
                </span>
                <span className="builder-card-actions">
                  <button type="button" onClick={(event) => { event.stopPropagation(); moveSection(index, index - 1); }} title={labels.moveUp}>{labels.moveUp}</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); moveSection(index, index + 1); }} title={labels.moveDown}>{labels.moveDown}</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); removeSection(section.id); }} title={labels.removeSection}>{labels.removeSection}</button>
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="builder-panel">
          {renderSectionEditor(selectedSection)}
        </section>
      </section>

      <div className="card-actions">
        <button className="button primary" type="submit" disabled={saving || publishing || loading}>
          {saving ? labels.saving : labels.save}
        </button>
        <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
          {publishing ? labels.publishing : labels.publish}
        </button>
      </div>
      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
