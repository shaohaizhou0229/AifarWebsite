import { Archive, Layers, Save, Sparkles } from "lucide-react";
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
  return (
    <aside className="builder-panel">
      <div className="builder-panel-head">
        <p className="eyebrow">{labels.templates}</p>
        <Layers size={16} aria-hidden="true" />
      </div>
      <div className="template-card-list">
        {templates.map((template) => (
          <div className="template-row" key={template.id || template.key}>
            <button className="template-card" type="button" onClick={() => onApplyTemplate(template)}>
              <TemplateMiniPreview content={getTemplatePreviewContent?.(template)} labels={labels} />
              <span>
                <strong>{labels.templateNames?.[template.key] || template.name || template.key}</strong>
                {template.description ? <small>{template.description}</small> : null}
              </span>
            </button>
            {!template.isSystem ? (
              <div className="template-row-actions">
                <button className="icon-button" type="button" onClick={() => onUpdateTemplate(template)} title={labels.updateTemplate}>
                  <Save size={15} aria-hidden="true" />
                </button>
                <button className="icon-button danger" type="button" onClick={() => onArchiveTemplate(template)} title={labels.archiveTemplate}>
                  <Archive size={15} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="template-save-box">
        <input
          value={templateDraft.name}
          placeholder={labels.templateName}
          onChange={(event) => onTemplateDraftChange({ ...templateDraft, name: event.target.value })}
        />
        <textarea
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
        <button className="button primary compact" type="button" onClick={onCreateTemplate} disabled={templateSaving}>
          {templateSaving ? labels.saving : labels.saveAsTemplate}
        </button>
      </div>
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
