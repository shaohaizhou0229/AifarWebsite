function getImageSpec(section, pathKey) {
  return section.settings?.imageSpecs?.[pathKey] || {};
}

export function SectionImageUpload({ section, pathKey, urlKey, label, labels, onPatchSection, onOpenAssetPicker }) {
  const imageUrl = section.content?.[urlKey] || "";
  const imageSpec = getImageSpec(section, pathKey);

  function updateImageSpec(key, value) {
    const numberValue = Number(value || 0);
    onPatchSection(section.id, (current) => {
      const currentSpecs = current.settings?.imageSpecs || {};
      const nextSpec = {
        ...(currentSpecs[pathKey] || {}),
        [key]: numberValue > 0 ? numberValue : ""
      };
      return {
        ...current,
        settings: {
          ...(current.settings || {}),
          imageSpecs: {
            ...currentSpecs,
            [pathKey]: nextSpec
          }
        }
      };
    });
  }

  return (
    <section className="builder-image-field">
      <div>
        <p className="eyebrow">{label}</p>
        <p className="muted-line">{section.content?.[pathKey] || labels.noImage}</p>
      </div>
      {imageUrl ? <img className="cms-image-preview" src={imageUrl} alt={section.content?.heroAlt || section.content?.imageAlt || label} /> : null}
      <div className="builder-image-spec">
        <p className="eyebrow">{labels.targetImageSize}</p>
        <div>
          <label>
            <span>{labels.targetWidth}</span>
            <input min="1" type="number" inputMode="numeric" value={imageSpec.width || ""} onChange={(event) => updateImageSpec("width", event.target.value)} />
          </label>
          <label>
            <span>{labels.targetHeight}</span>
            <input min="1" type="number" inputMode="numeric" value={imageSpec.height || ""} onChange={(event) => updateImageSpec("height", event.target.value)} />
          </label>
        </div>
        <p>{labels.imageSizeHint}</p>
      </div>
      <div className="upload-picker">
        <button className="button secondary compact" type="button" onClick={() => onOpenAssetPicker(section.id, pathKey, urlKey)}>
          {labels.chooseImage}
        </button>
      </div>
    </section>
  );
}
