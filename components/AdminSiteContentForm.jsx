"use client";

import { useMemo, useState } from "react";

const EMPTY_ENTRY = {
  isPublished: false,
  publishedAt: null,
  updatedAt: null
};

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content || {}));
}

function updateSeo(content, key, value) {
  return {
    ...content,
    seo: {
      ...(content.seo || {}),
      [key]: value
    }
  };
}

function updateListCell(content, listKey, rowIndex, cellIndex, value) {
  const list = Array.isArray(content[listKey]) ? content[listKey].map((row) => [...row]) : [];
  list[rowIndex] = list[rowIndex] || [];
  list[rowIndex][cellIndex] = value;
  return {
    ...content,
    [listKey]: list
  };
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function AdminSiteContentForm({
  labels,
  initialPageKey,
  initialLocale,
  initialContent,
  initialEntry,
  pageOptions,
  localeOptions
}) {
  const [pageKey, setPageKey] = useState(initialPageKey);
  const [locale, setLocale] = useState(initialLocale);
  const [content, setContent] = useState(() => cloneContent(initialContent));
  const [entry, setEntry] = useState(initialEntry || EMPTY_ENTRY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentPage = useMemo(
    () => pageOptions.find((option) => option.key === pageKey) || pageOptions[0],
    [pageKey, pageOptions]
  );

  async function loadContent(nextPageKey, nextLocale) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/site-content/?page=${encodeURIComponent(nextPageKey)}&locale=${encodeURIComponent(nextLocale)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.loadFailed);
      }

      setPageKey(nextPageKey);
      setLocale(nextLocale);
      setContent(cloneContent(data.content));
      setEntry(data.entry || EMPTY_ENTRY);
    } catch (loadError) {
      setError(loadError.message || labels.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setContent((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/site-content/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale, content })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.saveFailed);
      }

      setContent(cloneContent(data.content));
      setEntry(data.entry || EMPTY_ENTRY);
      setMessage(labels.saved);
    } catch (saveError) {
      setError(saveError.message || labels.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    setPublishing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/site-content/publish/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.publishFailed);
      }

      setContent(cloneContent(data.content));
      setEntry(data.entry || EMPTY_ENTRY);
      setMessage(labels.published);
    } catch (publishError) {
      setError(publishError.message || labels.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.set("pageKey", pageKey);
      formData.set("locale", locale);
      formData.set("file", file);

      const response = await fetch("/api/admin/site-content/image/", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.uploadFailed);
      }

      setContent((current) => ({
        ...current,
        heroImagePath: data.storagePath,
        heroImageUrl: data.url
      }));
      setMessage(labels.uploaded);
    } catch (uploadError) {
      setError(uploadError.message || labels.uploadFailed);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const isHome = pageKey === "home";
  const featureRows = Array.isArray(content.features) ? content.features : [];
  const trustRows = Array.isArray(content.trust) ? content.trust : [];
  const moduleRows = Array.isArray(content.modules) ? content.modules : [];

  return (
    <form className="admin-actions site-content-form" onSubmit={saveDraft}>
      <div className="cms-toolbar">
        <div className="field">
          <label htmlFor="cmsPage">{labels.page}</label>
          <select
            id="cmsPage"
            value={pageKey}
            onChange={(event) => loadContent(event.target.value, locale)}
            disabled={loading || saving || publishing}
          >
            {pageOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cmsLocale">{labels.locale}</label>
          <select
            id="cmsLocale"
            value={locale}
            onChange={(event) => loadContent(pageKey, event.target.value)}
            disabled={loading || saving || publishing}
          >
            {localeOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="cms-status-panel">
        <div>
          <p className="eyebrow">{labels.status}</p>
          <h3>{currentPage.label}</h3>
          <p className="muted-line">
            {entry?.isPublished ? labels.publishedStatus : labels.draftStatus}
            {entry?.updatedAt ? ` · ${labels.updatedAt}: ${formatDate(entry.updatedAt, locale)}` : ""}
            {entry?.publishedAt ? ` · ${labels.publishedAt}: ${formatDate(entry.publishedAt, locale)}` : ""}
          </p>
        </div>
        <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
          {publishing ? labels.publishing : labels.publish}
        </button>
      </div>

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="seoTitle">{labels.seoTitle}</label>
          <input
            id="seoTitle"
            value={content.seo?.title || ""}
            onChange={(event) => setContent((current) => updateSeo(current, "title", event.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="seoDescription">{labels.seoDescription}</label>
          <input
            id="seoDescription"
            value={content.seo?.description || ""}
            onChange={(event) => setContent((current) => updateSeo(current, "description", event.target.value))}
          />
        </div>
      </div>

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="eyebrow">{labels.eyebrow}</label>
          <input id="eyebrow" value={content.eyebrow || ""} onChange={(event) => updateField("eyebrow", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="title">{labels.title}</label>
          <input id="title" value={content.title || ""} onChange={(event) => updateField("title", event.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="lead">{labels.lead}</label>
        <textarea id="lead" value={content.lead || ""} onChange={(event) => updateField("lead", event.target.value)} />
      </div>

      {isHome ? (
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="primaryCta">{labels.primaryCta}</label>
            <input id="primaryCta" value={content.primaryCta || ""} onChange={(event) => updateField("primaryCta", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="secondaryCta">{labels.secondaryCta}</label>
            <input id="secondaryCta" value={content.secondaryCta || ""} onChange={(event) => updateField("secondaryCta", event.target.value)} />
          </div>
        </div>
      ) : null}

      <section className="cms-editor-section">
        <div>
          <p className="eyebrow">{labels.heroImage}</p>
          <h3>{content.heroImagePath || labels.noImage}</h3>
          <p className="muted-line">{labels.imageHint}</p>
        </div>
        {content.heroImageUrl ? <img className="cms-image-preview" src={content.heroImageUrl} alt={content.heroAlt || labels.heroImage} /> : null}
        <div className="field">
          <label htmlFor="heroAlt">{labels.heroAlt}</label>
          <input id="heroAlt" value={content.heroAlt || ""} onChange={(event) => updateField("heroAlt", event.target.value)} />
        </div>
        <div className="upload-picker">
          <input id="siteHeroImage" className="file-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={uploadImage} />
          <label className="button secondary" htmlFor="siteHeroImage">
            {uploading ? labels.uploading : labels.chooseImage}
          </label>
        </div>
      </section>

      {isHome ? (
        <>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="modulesTitle">{labels.modulesTitle}</label>
              <input id="modulesTitle" value={content.modulesTitle || ""} onChange={(event) => updateField("modulesTitle", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="modulesLead">{labels.modulesLead}</label>
              <input id="modulesLead" value={content.modulesLead || ""} onChange={(event) => updateField("modulesLead", event.target.value)} />
            </div>
          </div>

          <section className="cms-editor-section">
            <p className="eyebrow">{labels.trustItems}</p>
            {trustRows.map((row, rowIndex) => (
              <div className="form-grid two" key={`trust-${rowIndex}`}>
                <input value={row[0] || ""} aria-label={labels.value} onChange={(event) => setContent((current) => updateListCell(current, "trust", rowIndex, 0, event.target.value))} />
                <input value={row[1] || ""} aria-label={labels.description} onChange={(event) => setContent((current) => updateListCell(current, "trust", rowIndex, 1, event.target.value))} />
              </div>
            ))}
          </section>

          <section className="cms-editor-section">
            <p className="eyebrow">{labels.modules}</p>
            {moduleRows.map((row, rowIndex) => (
              <div className="form-grid three" key={`module-${rowIndex}`}>
                <input value={row[0] || ""} aria-label={labels.icon} onChange={(event) => setContent((current) => updateListCell(current, "modules", rowIndex, 0, event.target.value))} />
                <input value={row[1] || ""} aria-label={labels.itemTitle} onChange={(event) => setContent((current) => updateListCell(current, "modules", rowIndex, 1, event.target.value))} />
                <input value={row[2] || ""} aria-label={labels.description} onChange={(event) => setContent((current) => updateListCell(current, "modules", rowIndex, 2, event.target.value))} />
              </div>
            ))}
          </section>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="managedTitle">{labels.managedTitle}</label>
              <input id="managedTitle" value={content.managedTitle || ""} onChange={(event) => updateField("managedTitle", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="managedLead">{labels.managedLead}</label>
              <input id="managedLead" value={content.managedLead || ""} onChange={(event) => updateField("managedLead", event.target.value)} />
            </div>
          </div>
        </>
      ) : null}

      <section className="cms-editor-section">
        <p className="eyebrow">{isHome ? labels.features : labels.productFeatures}</p>
        {featureRows.map((row, rowIndex) => (
          <div className={`form-grid ${isHome ? "two" : "three"}`} key={`feature-${rowIndex}`}>
            {!isHome ? (
              <input value={row[0] || ""} aria-label={labels.icon} onChange={(event) => setContent((current) => updateListCell(current, "features", rowIndex, 0, event.target.value))} />
            ) : null}
            <input value={row[isHome ? 0 : 1] || ""} aria-label={labels.itemTitle} onChange={(event) => setContent((current) => updateListCell(current, "features", rowIndex, isHome ? 0 : 1, event.target.value))} />
            <input value={row[isHome ? 1 : 2] || ""} aria-label={labels.description} onChange={(event) => setContent((current) => updateListCell(current, "features", rowIndex, isHome ? 1 : 2, event.target.value))} />
          </div>
        ))}
      </section>

      <div className="card-actions">
        <button className="button primary" type="submit" disabled={saving || publishing || loading}>
          {saving ? labels.saving : labels.save}
        </button>
        <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
          {publishing ? labels.publishing : labels.publish}
        </button>
      </div>
      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
