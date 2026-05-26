"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/MarkdownEditor";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function AdminDocumentForm({ document, categories, labels, assetLabels, locale }) {
  const router = useRouter();
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
  const [draftNotice, setDraftNotice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const lastSavedRef = useRef(initial);
  const hasUnsavedChangesRef = useRef(false);
  const skipUnloadWarningRef = useRef(false);
  const draftKey = useMemo(() => `aifar:admin-doc-draft:${locale}:${document?.id || "new"}`, [document?.id, locale]);
  const hasUnsavedChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(lastSavedRef.current), [form]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      if (draft?.form?.markdownContent && JSON.stringify(draft.form) !== JSON.stringify(initial)) {
        setDraftNotice(labels.draftFound);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, initial, labels.draftFound]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ form, savedAt: new Date().toISOString() }));
      setDraftNotice(labels.draftSaved);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [draftKey, form, hasUnsavedChanges, labels.draftSaved]);

  useEffect(() => {
    function warnBeforeUnload(event) {
      if (skipUnloadWarningRef.current || !hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = labels.unsavedWarning;
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [labels.unsavedWarning]);

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

  function updateMarkdownContent(markdownContent) {
    setForm((current) => ({
      ...current,
      markdownContent
    }));
  }

  function restoreDraft() {
    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      if (draft?.form) {
        setForm(draft.form);
        setDraftNotice(labels.draftRestored);
      }
    } catch {
      setError(labels.draftRestoreFailed);
    }
  }

  function discardDraft() {
    window.localStorage.removeItem(draftKey);
    setDraftNotice("");
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
      window.localStorage.removeItem(draftKey);
      lastSavedRef.current = form;
      skipUnloadWarningRef.current = true;
      const nextId = data.document?.id || document?.id;
      if (nextId) {
        router.push(`/${locale}/admin/docs/${nextId}/`);
      } else {
        router.refresh();
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

      skipUnloadWarningRef.current = true;
      router.push(`/${locale}/admin/docs/`);
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
        {draftNotice ? (
          <div className="draft-status">
            <span>{draftNotice}</span>
            <div>
              <button className="button secondary compact" type="button" onClick={restoreDraft}>{labels.restoreDraft}</button>
              <button className="button secondary compact" type="button" onClick={discardDraft}>{labels.discardDraft}</button>
            </div>
          </div>
        ) : null}
        <MarkdownEditor id="markdownContent" labels={labels} assetLabels={assetLabels} locale={locale} value={form.markdownContent} onChange={updateMarkdownContent} />
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
