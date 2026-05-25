"use client";

import { useRef } from "react";

export function SectionImageUpload({ section, pathKey, urlKey, label, labels, uploadingSectionId, onUploadImage }) {
  const inputId = `${section.id}-${pathKey}`;
  const imageUrl = section.content?.[urlKey] || "";
  const inputRef = useRef(null);
  const isUploading = uploadingSectionId === section.id;

  function openImagePicker() {
    inputRef.current?.click();
  }

  return (
    <section className="builder-image-field">
      <div>
        <p className="eyebrow">{label}</p>
        <p className="muted-line">{section.content?.[pathKey] || labels.noImage}</p>
      </div>
      {imageUrl ? <img className="cms-image-preview" src={imageUrl} alt={section.content?.heroAlt || section.content?.imageAlt || label} /> : null}
      <div className="upload-picker">
        <input
          ref={inputRef}
          id={inputId}
          className="file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          tabIndex={-1}
          onChange={(event) => onUploadImage(event, section.id, pathKey, urlKey)}
        />
        <button className="button secondary compact" type="button" onClick={openImagePicker} disabled={isUploading}>
          {isUploading ? labels.uploading : labels.chooseImage}
        </button>
      </div>
    </section>
  );
}
