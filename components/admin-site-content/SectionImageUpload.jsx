export function SectionImageUpload({ section, pathKey, urlKey, label, labels, uploadingSectionId, onUploadImage }) {
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
        <input
          id={inputId}
          className="file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => onUploadImage(event, section.id, pathKey, urlKey)}
        />
        <label className="button secondary compact" htmlFor={inputId}>
          {uploadingSectionId === section.id ? labels.uploading : labels.chooseImage}
        </label>
      </div>
    </section>
  );
}
