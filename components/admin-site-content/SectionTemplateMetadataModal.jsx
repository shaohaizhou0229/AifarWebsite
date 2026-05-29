"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import sectionTemplateRules from "@/lib/section-template-rules.cjs";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";

const { SECTION_TEMPLATE_INDUSTRIES } = sectionTemplateRules;
const { createTemplateMetadataDraft } = sectionTemplateUi;

function getIndustryLabel(labels, industry) {
  return labels.templateIndustries?.[industry] || industry;
}

function getPageLabel(labels, pageKey) {
  if (pageKey === "home") return labels.homePage;
  if (pageKey === "product") return labels.productPage;
  return labels.templateAllPages || pageKey;
}

export function SectionTemplateMetadataModal({
  labels,
  template,
  pageOptions = [],
  busy = false,
  error = "",
  onClose,
  onSave
}) {
  const [draft, setDraft] = useState(() => createTemplateMetadataDraft(template));

  useEffect(() => {
    setDraft(createTemplateMetadataDraft(template));
  }, [template]);

  if (!template) return null;

  function patchDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(draft);
  }

  return (
    <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.editTemplateInfo} onPointerDown={onClose}>
      <form className="site-preview-modal-panel template-metadata-modal" onSubmit={submit} onPointerDown={(event) => event.stopPropagation()}>
        <header className="site-preview-modal-head">
          <div>
            <p className="eyebrow">{labels.templateLibrary}</p>
            <strong>{labels.editTemplateInfo}</strong>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title={labels.closePreview} aria-label={labels.closePreview} disabled={busy}>
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="template-metadata-form">
          <label className="template-metadata-field">
            <span>{labels.templateName}</span>
            <input value={draft.name} onChange={(event) => patchDraft("name", event.target.value)} maxLength={80} required disabled={busy} />
          </label>
          <label className="template-metadata-field">
            <span>{labels.templateDescription}</span>
            <textarea value={draft.description} onChange={(event) => patchDraft("description", event.target.value)} maxLength={180} rows={3} disabled={busy} />
          </label>
          <div className="template-metadata-grid">
            <label className="template-metadata-field">
              <span>{labels.templateIndustry}</span>
              <select value={draft.industry} onChange={(event) => patchDraft("industry", event.target.value)} disabled={busy}>
                {SECTION_TEMPLATE_INDUSTRIES.map((industry) => (
                  <option value={industry} key={industry}>{getIndustryLabel(labels, industry)}</option>
                ))}
              </select>
            </label>
            <label className="template-metadata-field">
              <span>{labels.templatePageScope}</span>
              <select value={draft.pageKey} onChange={(event) => patchDraft("pageKey", event.target.value)} disabled={busy}>
                <option value="">{labels.templateAllPages}</option>
                {pageOptions.map((option) => (
                  <option value={option.key} key={option.key}>{option.label || getPageLabel(labels, option.key)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="template-metadata-field">
            <span>{labels.templatePurpose}</span>
            <input value={draft.purpose} onChange={(event) => patchDraft("purpose", event.target.value)} maxLength={80} disabled={busy} />
          </label>
          <label className="template-metadata-field">
            <span>{labels.templateTags}</span>
            <input value={draft.tagsText} onChange={(event) => patchDraft("tagsText", event.target.value)} placeholder={labels.templateTagsPlaceholder} maxLength={160} disabled={busy} />
          </label>
          <label className="template-metadata-favorite">
            <input type="checkbox" checked={draft.isFavorite} onChange={(event) => patchDraft("isFavorite", event.target.checked)} disabled={busy} />
            <Star size={15} aria-hidden="true" />
            <span>{labels.markTemplateFavorite}</span>
          </label>
          {error ? <p className="form-message error">{error}</p> : null}
        </div>

        <footer className="template-metadata-actions">
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            {labels.closePreview}
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? labels.saving : labels.saveTemplateInfo}
          </button>
        </footer>
      </form>
    </div>
  );
}
