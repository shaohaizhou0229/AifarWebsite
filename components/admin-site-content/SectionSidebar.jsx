import { SITE_SECTION_LABELS, SITE_SECTION_TYPES } from "@/lib/site-page-builder";

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
  onAddSection
}) {
  return (
    <aside className="builder-panel">
      <p className="eyebrow">{labels.templates}</p>
      <div className="builder-button-list">
        {templates.map((template) => (
          <div className="template-row" key={template.id || template.key}>
            <button className="button secondary compact" type="button" onClick={() => onApplyTemplate(template)}>
              {labels.templateNames?.[template.key] || template.name || template.key}
            </button>
            {!template.isSystem ? (
              <div className="template-row-actions">
                <button className="icon-button" type="button" onClick={() => onUpdateTemplate(template)} title={labels.updateTemplate}>U</button>
                <button className="icon-button danger" type="button" onClick={() => onArchiveTemplate(template)} title={labels.archiveTemplate}>-</button>
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
      <p className="eyebrow">{labels.addSection}</p>
      <div className="builder-button-list">
        {SITE_SECTION_TYPES.map((type) => (
          <button className="button secondary compact" type="button" key={type} onClick={() => onAddSection(type)}>
            {labels.sectionTypes?.[type] || SITE_SECTION_LABELS[type]}
          </button>
        ))}
      </div>
    </aside>
  );
}
