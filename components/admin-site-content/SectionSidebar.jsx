"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Image, Layers, LayoutTemplate, Save, Sparkles, Type, X } from "lucide-react";
import { SITE_SECTION_LABELS, SITE_SECTION_TYPES } from "@/lib/site-page-builder";
import { SectionMiniPreview, TemplateMiniPreview } from "./SectionPreview";

export function SectionSidebar({
  labels,
  templates = [],
  templateDraft,
  templateSaving,
  onTemplateDraftChange,
  onCreateTemplate,
  onUpdateTemplate,
  onArchiveTemplate,
  onApplyTemplate,
  onAddSection,
  getTemplatePreviewContent
}) {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const templateDialogRef = useRef(null);
  const canSaveTemplate = Boolean(templateDraft.name?.trim()) && !templateSaving;

  useEffect(() => {
    if (!isTemplateDialogOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setIsTemplateDialogOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isTemplateDialogOpen]);

  async function saveTemplateFromDialog() {
    if (!canSaveTemplate) return;
    const saved = await onCreateTemplate();
    if (saved !== false) setIsTemplateDialogOpen(false);
  }

  return (
    <aside className="builder-panel">
      <div className="builder-panel-head">
        <p className="eyebrow">{labels.templates}</p>
        <Layers size={16} aria-hidden="true" />
      </div>
      <div className="template-card-list">
        {templates.map((template) => (
          <div className="template-row" key={template.id || template.key}>
            <button className="template-card" type="button" onClick={() => onApplyTemplate(template, false)}>
              <TemplateMiniPreview content={getTemplatePreviewContent?.(template)} labels={labels} />
              <span>
                <strong>{labels.templateNames?.[template.key] || template.name || template.key}</strong>
                {template.description ? <small>{template.description}</small> : null}
              </span>
            </button>
            <div className="template-row-actions">
              <button className="button secondary compact" type="button" onClick={() => onApplyTemplate(template, false)}>
                {labels.applyStructure}
              </button>
              <button className="button secondary compact" type="button" onClick={() => onApplyTemplate(template, true)}>
                {labels.applyWithSeo}
              </button>
              {!template.isSystem ? (
                <>
                <button className="icon-button" type="button" onClick={() => onUpdateTemplate(template)} title={labels.updateTemplate} aria-label={labels.updateTemplate}>
                  <Save size={15} aria-hidden="true" />
                </button>
                <button className="icon-button danger" type="button" onClick={() => onArchiveTemplate(template)} title={labels.archiveTemplate} aria-label={labels.archiveTemplate}>
                  <Archive size={15} aria-hidden="true" />
                </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button className="button primary compact template-save-trigger" type="button" onClick={() => setIsTemplateDialogOpen(true)}>
        <Save size={15} aria-hidden="true" />
        {labels.saveAsTemplate}
      </button>

      {isTemplateDialogOpen ? (
        <div className="template-save-dialog" role="dialog" aria-modal="true" aria-label={labels.saveAsTemplate} onPointerDown={() => setIsTemplateDialogOpen(false)}>
          <div className="template-save-dialog-panel" ref={templateDialogRef} onPointerDown={(event) => event.stopPropagation()}>
            <header className="template-save-dialog-head">
              <div>
                <p className="eyebrow">{labels.templates}</p>
                <strong>{labels.saveAsTemplate}</strong>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsTemplateDialogOpen(false)} title={labels.closePreview} aria-label={labels.closePreview}>
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            <div className="template-save-box">
              <input
                aria-label={labels.templateName}
                name="templateName"
                autoComplete="off"
                value={templateDraft.name}
                placeholder={labels.templateName}
                onChange={(event) => onTemplateDraftChange({ ...templateDraft, name: event.target.value })}
                autoFocus
              />
              <textarea
                aria-label={labels.templateDescription}
                name="templateDescription"
                autoComplete="off"
                value={templateDraft.description}
                placeholder={labels.templateDescription}
                onChange={(event) => onTemplateDraftChange({ ...templateDraft, description: event.target.value })}
              />
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={templateDraft.includeSeo}
                  onChange={(event) => onTemplateDraftChange({ ...templateDraft, includeSeo: event.target.checked })}
                />
                <span>{labels.includeSeo}</span>
              </label>
            </div>
            <div className="template-save-dialog-actions">
              <button className="button secondary compact" type="button" onClick={() => setIsTemplateDialogOpen(false)}>
                {labels.closePreview}
              </button>
              <button className="button primary compact" type="button" onClick={saveTemplateFromDialog} disabled={!canSaveTemplate}>
                {templateSaving ? labels.saving : labels.saveAsTemplate}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="builder-panel-head">
        <p className="eyebrow">{labels.addSection}</p>
        <Sparkles size={16} aria-hidden="true" />
      </div>
      <div className="section-palette-grid">
        {SITE_SECTION_TYPES.map((type) => (
          <button className="section-palette-card" type="button" key={type} onClick={() => onAddSection(type)}>
            <SectionMiniPreview section={createPaletteSection(type, labels)} labels={labels} />
            <strong>{labels.sectionTypes?.[type] || SITE_SECTION_LABELS[type]}</strong>
            <small>{labels.sectionDescriptions?.[type] || labels.addSection}</small>
            <span className="section-layout-popover" aria-hidden="true">
              <span className="section-layout-popover-title">{labels.hoverPreview}</span>
              <span><Type size={14} />{labels.layoutText}</span>
              <span><LayoutTemplate size={14} />{labels.layoutIcon}</span>
              <span><Image size={14} />{labels.layoutImage}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function createPaletteSection(type, labels) {
  return {
    id: `palette-${type}`,
    type,
    content: {
      title: labels.sectionTypes?.[type] || SITE_SECTION_LABELS[type],
      lead: "",
      items: [["", "", ""]]
    }
  };
}
