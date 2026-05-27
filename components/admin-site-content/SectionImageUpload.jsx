import imageGenerationRules from "@/lib/image-generation-settings-core.cjs";

const { resolveImageTargetSize } = imageGenerationRules;

function getImageSpec(section, pathKey) {
  return section.settings?.imageSpecs?.[pathKey] || {};
}

function formatTargetSize(size) {
  return `${size.targetWidth} x ${size.targetHeight}`;
}

export function SectionImageUpload({ section, pathKey, urlKey, label, labels, defaultTargetSize = "1024x1024", onPatchSection, onOpenAssetPicker }) {
  const imageUrl = section.content?.[urlKey] || "";
  const imageSpec = getImageSpec(section, pathKey);
  const targetSize = resolveImageTargetSize({
    sectionType: section.type,
    pathKey,
    spec: imageSpec,
    defaultSize: defaultTargetSize
  });
  const recommendation = targetSize.recommendation;

  function updateImageSpec(key, value) {
    const numberValue = Number(value || 0);
    onPatchSection(section.id, (current) => {
      const currentSpecs = current.settings?.imageSpecs || {};
      const nextSpec = {
        ...(currentSpecs[pathKey] || {}),
        source: "sectionImageSpec",
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

  function useRecommendedSize() {
    onPatchSection(section.id, (current) => {
      const currentSpecs = current.settings?.imageSpecs || {};
      const { [pathKey]: _removed, ...nextSpecs } = currentSpecs;
      return {
        ...current,
        settings: {
          ...(current.settings || {}),
          imageSpecs: nextSpecs
        }
      };
    });
  }

  function resetToDefaultSize() {
    onPatchSection(section.id, (current) => {
      const currentSpecs = current.settings?.imageSpecs || {};
      return {
        ...current,
        settings: {
          ...(current.settings || {}),
          imageSpecs: {
            ...currentSpecs,
            [pathKey]: {
              width: targetSize.defaultTarget.width,
              height: targetSize.defaultTarget.height,
              source: "aiDefault"
            }
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
        <div className="builder-image-spec-head">
          <p className="eyebrow">{labels.targetImageSize}</p>
          <span>{labels.targetSizeSourceLabels?.[targetSize.sizeSource] || targetSize.sizeSource}</span>
        </div>
        {recommendation ? (
          <p className="builder-image-size-summary">{labels.recommendedTargetSize}: {formatTargetSize({ targetWidth: recommendation.width, targetHeight: recommendation.height })}</p>
        ) : null}
        <div>
          <label>
            <span>{labels.targetWidth}</span>
            <input min="128" max="4096" type="number" inputMode="numeric" value={targetSize.targetWidth || ""} onChange={(event) => updateImageSpec("width", event.target.value)} />
          </label>
          <label>
            <span>{labels.targetHeight}</span>
            <input min="128" max="4096" type="number" inputMode="numeric" value={targetSize.targetHeight || ""} onChange={(event) => updateImageSpec("height", event.target.value)} />
          </label>
        </div>
        <p className="builder-image-size-summary">{labels.actualGenerationSize}: {targetSize.actualSize}</p>
        {targetSize.hasPartialCustomSize ? <p className="warning">{labels.incompleteTargetSize}</p> : null}
        <p>{labels.imageSizeHint}</p>
        <div className="builder-image-spec-actions">
          <button className="button secondary compact" type="button" onClick={useRecommendedSize}>
            {labels.useRecommendedSize}
          </button>
          <button className="button secondary compact" type="button" onClick={resetToDefaultSize}>
            {labels.resetDefaultSize}
          </button>
        </div>
      </div>
      <div className="upload-picker">
        <button className="button secondary compact" type="button" onClick={() => onOpenAssetPicker(section.id, pathKey, urlKey)}>
          {labels.chooseImage}
        </button>
      </div>
    </section>
  );
}
