import { Field } from "./EditorControls";

export function SeoEditor({ labels, content, onChange }) {
  return (
    <section className="cms-editor-section">
      <p className="eyebrow">{labels.seo}</p>
      <div className="form-grid two">
        <Field label={labels.seoTitle}>
          <input value={content.seo?.title || ""} onChange={(event) => onChange("title", event.target.value)} />
        </Field>
        <Field label={labels.seoDescription}>
          <input value={content.seo?.description || ""} onChange={(event) => onChange("description", event.target.value)} />
        </Field>
      </div>
    </section>
  );
}
