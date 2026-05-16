"use client";

import { useMemo, useState } from "react";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function AdminDocumentForm({ document, categories, labels, locale }) {
  const isEditing = Boolean(document?.id);
  const initial = useMemo(() => ({
    title: document?.title || "",
    slug: document?.slug || "",
    summary: document?.summary || "",
    categoryKey: document?.categoryKey || categories[0]?.key || "operation_guides",
    versionLabel: document?.currentVersionLabel || "v1.0",
    markdownContent: document?.markdownContent || "",
    originalFilename: document?.originalFilename || "document.md",
    isPublished: Boolean(document?.isPublished)
  }), [categories, document]);

  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function updateTitle(event) {
    const title = event.target.value;
    setForm((current) => ({
      ...current,
      title,
      slug: current.slug ? current.slug : slugify(title)
    }));
  }

  async function readMarkdownFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md")) {
      setError(labels.fileTypeError);
      return;
    }

    const text = await file.text();
    setForm((current) => ({
      ...current,
      markdownContent: text,
      originalFilename: file.name,
      title: current.title || file.name.replace(/\.md$/i, ""),
      slug: current.slug || slugify(file.name.replace(/\.md$/i, ""))
    }));
    setError("");
  }

  async function saveDocument(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(isEditing ? `/api/admin/docs/${document.id}/` : "/api/admin/docs/", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.saveFailed);
      }

      setMessage(labels.saved);
      const nextId = data.document?.id || document?.id;
      if (nextId) {
        window.location.href = `/${locale}/admin/docs/${nextId}/`;
      } else {
        window.location.reload();
      }
    } catch (saveError) {
      setError(saveError.message || labels.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function archiveDocument() {
    const confirmed = window.confirm(labels.archiveConfirm);
    if (!confirmed) return;

    setArchiving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/docs/${document.id}/`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.archiveFailed);
      }

      window.location.href = `/${locale}/admin/docs/`;
    } catch (archiveError) {
      setError(archiveError.message || labels.archiveFailed);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <form className="admin-actions document-editor" onSubmit={saveDocument}>
      <div className="upload-workflow">
        <div>
          <p className="eyebrow">{labels.markdownFile}</p>
          <h3>{form.originalFilename || labels.chooseMarkdown}</h3>
          <p className="muted-line">{labels.fileHint}</p>
        </div>
        <div className="upload-picker">
          <input id="markdownFile" className="file-input" type="file" accept=".md" onChange={readMarkdownFile} />
          <label className="button secondary" htmlFor="markdownFile">{labels.chooseFile}</label>
        </div>
      </div>

      <div className="document-editor-grid">
        <div className="field">
          <label htmlFor="title">{labels.title}</label>
          <input id="title" name="title" value={form.title} onChange={updateTitle} required />
        </div>
        <div className="field">
          <label htmlFor="slug">{labels.slug}</label>
          <input id="slug" name="slug" value={form.slug} onChange={updateField} required />
        </div>
        <div className="field">
          <label htmlFor="categoryKey">{labels.category}</label>
          <select id="categoryKey" name="categoryKey" value={form.categoryKey} onChange={updateField}>
            {categories.map((category) => (
              <option key={category.key} value={category.key}>{category.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="versionLabel">{labels.version}</label>
          <input id="versionLabel" name="versionLabel" value={form.versionLabel} onChange={updateField} required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="summary">{labels.summary}</label>
        <textarea id="summary" name="summary" value={form.summary} onChange={updateField} />
      </div>
      <div className="field">
        <label htmlFor="markdownContent">{labels.markdownContent}</label>
        <textarea id="markdownContent" name="markdownContent" className="markdown-textarea" value={form.markdownContent} onChange={updateField} required />
      </div>
      <label className="checkbox-line">
        <input name="isPublished" type="checkbox" checked={form.isPublished} onChange={updateField} />
        <span>{labels.published}</span>
      </label>
      <div className="card-actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? labels.saving : labels.save}
        </button>
        {isEditing ? (
          <button className="button secondary danger" type="button" onClick={archiveDocument} disabled={archiving || saving}>
            {archiving ? labels.archiving : labels.archive}
          </button>
        ) : null}
      </div>
      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
