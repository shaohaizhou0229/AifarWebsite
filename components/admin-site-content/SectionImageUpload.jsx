export function SectionImageUpload({ section, pathKey, urlKey, label, labels, onOpenAssetPicker }) {
  const imageUrl = section.content?.[urlKey] || "";

  return (
    <section className="builder-image-field">
      <div>
        <p className="eyebrow">{label}</p>
        <p className="muted-line">{section.content?.[pathKey] || labels.noImage}</p>
      </div>
      {imageUrl ? <img className="cms-image-preview" src={imageUrl} alt={section.content?.heroAlt || section.content?.imageAlt || label} /> : null}
      <div className="upload-picker">
        <button className="button secondary compact" type="button" onClick={() => onOpenAssetPicker(section.id, pathKey, urlKey)}>
          {labels.chooseImage}
        </button>
      </div>
    </section>
  );
}
