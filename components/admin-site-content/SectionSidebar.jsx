import { SITE_SECTION_LABELS, SITE_SECTION_TYPES } from "@/lib/site-page-builder";

export function SectionSidebar({ labels, templateKeys, onApplyTemplate, onAddSection }) {
  return (
    <aside className="builder-panel">
      <p className="eyebrow">{labels.templates}</p>
      <div className="builder-button-list">
        {templateKeys.map((templateKey) => (
          <button className="button secondary compact" type="button" key={templateKey} onClick={() => onApplyTemplate(templateKey)}>
            {labels.templateNames?.[templateKey] || templateKey}
          </button>
        ))}
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
