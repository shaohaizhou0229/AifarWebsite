"use client";

import { useEffect, useMemo, useState } from "react";
import { SITE_LAYOUT_VERSION, createBlankSection } from "@/lib/site-page-builder";
import { AdminVersionTimeline } from "@/components/AdminVersionTimeline";
import { CmsToolbar } from "@/components/admin-site-content/CmsToolbar";
import { ContentStatusPanel } from "@/components/admin-site-content/ContentStatusPanel";
import { SectionEditor } from "@/components/admin-site-content/SectionEditor";
import { SectionList } from "@/components/admin-site-content/SectionList";
import { SectionSidebar } from "@/components/admin-site-content/SectionSidebar";
import { SeoEditor } from "@/components/admin-site-content/SeoEditor";
import { EMPTY_ENTRY, ensureLayout, moveItem, updateSectionAt, updateSeo } from "@/components/admin-site-content/form-utils";

export function AdminSiteContentForm({
  labels,
  initialPageKey,
  initialLocale,
  initialContent,
  initialEntry,
  initialSnapshots = [],
  initialTemplates = [],
  pageOptions,
  localeOptions
}) {
  const [pageKey, setPageKey] = useState(initialPageKey);
  const [locale, setLocale] = useState(initialLocale);
  const [content, setContent] = useState(() => ensureLayout(initialContent));
  const [entry, setEntry] = useState(initialEntry || EMPTY_ENTRY);
  const [selectedSectionId, setSelectedSectionId] = useState(() => initialContent?.sections?.[0]?.id || "");
  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingSectionId, setUploadingSectionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateDraft, setTemplateDraft] = useState({ name: "", description: "", includeSeo: false });
  const [templateSaving, setTemplateSaving] = useState(false);

  const currentPage = useMemo(
    () => pageOptions.find((option) => option.key === pageKey) || pageOptions[0],
    [pageKey, pageOptions]
  );
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0] || null;

  useEffect(() => {
    setSnapshots(initialSnapshots);
    setTemplates(initialTemplates);
  }, [initialSnapshots, initialTemplates]);

  function updateServerState(data) {
    if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
    if (Array.isArray(data.templates)) setTemplates(data.templates);
  }

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

      const nextContent = ensureLayout(data.content);
      setPageKey(nextPageKey);
      setLocale(nextLocale);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setSelectedSectionId(nextContent.sections[0]?.id || "");
      updateServerState(data);
    } catch (loadError) {
      setError(loadError.message || labels.loadFailed);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({ pageKey, locale, content: ensureLayout(content) })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.saveFailed);
      }

      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setSelectedSectionId((current) => current || nextContent.sections[0]?.id || "");
      updateServerState(data);
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

      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      updateServerState(data);
      setMessage(labels.published);
    } catch (publishError) {
      setError(publishError.message || labels.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  async function uploadImage(event, sectionId, pathKey, urlKey) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSectionId(sectionId);
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

      patchSection(sectionId, (section) => ({
        ...section,
        content: {
          ...(section.content || {}),
          [pathKey]: data.storagePath,
          [urlKey]: data.url
        }
      }));
      setMessage(labels.uploaded);
    } catch (uploadError) {
      setError(uploadError.message || labels.uploadFailed);
    } finally {
      setUploadingSectionId("");
      event.target.value = "";
    }
  }

  function patchSection(sectionId, updater) {
    setContent((current) => ({
      ...current,
      layoutVersion: SITE_LAYOUT_VERSION,
      sections: updateSectionAt(current.sections || [], sectionId, updater)
    }));
  }

  function patchSectionContent(sectionId, key, value) {
    patchSection(sectionId, (section) => ({
      ...section,
      content: {
        ...(section.content || {}),
        [key]: value
      }
    }));
  }

  async function applyTemplate(templateRecord) {
    setTemplateSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/templates/${templateRecord.id}/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateSaveFailed);
      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setEntry(data.entry || EMPTY_ENTRY);
      setSelectedSectionId(nextContent.sections[0]?.id || "");
      updateServerState(data);
      setMessage(labels.templateApplied);
    } catch (templateError) {
      setError(templateError.message || labels.templateSaveFailed);
    } finally {
      setTemplateSaving(false);
    }
  }

  async function createTemplate() {
    setTemplateSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/site-content/templates/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...templateDraft, pageKey, locale, content: ensureLayout(content) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateSaveFailed);
      setTemplates((current) => [...current, data.template]);
      setTemplateDraft({ name: "", description: "", includeSeo: false });
      setMessage(labels.templateSaved);
    } catch (templateError) {
      setError(templateError.message || labels.templateSaveFailed);
    } finally {
      setTemplateSaving(false);
    }
  }

  async function updateTemplate(template) {
    setTemplateSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/templates/${template.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          includeSeo: template.includeSeo,
          content: ensureLayout(content)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateSaveFailed);
      setTemplates((current) => current.map((item) => (item.id === template.id ? data.template : item)));
      setMessage(labels.templateSaved);
    } catch (templateError) {
      setError(templateError.message || labels.templateSaveFailed);
    } finally {
      setTemplateSaving(false);
    }
  }

  async function archiveTemplate(template) {
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/templates/${template.id}/`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateArchiveFailed);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setMessage(labels.templateArchived);
    } catch (templateError) {
      setError(templateError.message || labels.templateArchiveFailed);
    }
  }

  async function restoreSnapshot(snapshot) {
    const response = await fetch(`/api/admin/site-content/snapshots/${snapshot.id}/restore/`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || labels.restoreFailed);
    const nextContent = ensureLayout(data.content);
    setContent(nextContent);
    setEntry(data.entry || EMPTY_ENTRY);
    setSelectedSectionId(nextContent.sections[0]?.id || "");
    updateServerState(data);
  }

  function addSection(type) {
    const section = createBlankSection(type);
    setContent((current) => ({
      ...current,
      layoutVersion: SITE_LAYOUT_VERSION,
      sections: [...(current.sections || []), section]
    }));
    setSelectedSectionId(section.id);
  }

  function removeSection(sectionId) {
    const nextSections = sections.filter((section) => section.id !== sectionId);
    setContent((current) => ({ ...current, sections: nextSections }));
    setSelectedSectionId(nextSections[0]?.id || "");
  }

  function moveSection(fromIndex, toIndex) {
    const nextSections = moveItem(sections, fromIndex, toIndex);
    setContent((current) => ({ ...current, sections: nextSections }));
  }

  function onDropSection(toIndex) {
    if (dragIndex === null) return;
    moveSection(dragIndex, toIndex);
    setDragIndex(null);
  }

  return (
    <form className="admin-actions site-content-form" onSubmit={saveDraft}>
      <CmsToolbar
        labels={labels}
        pageKey={pageKey}
        locale={locale}
        pageOptions={pageOptions}
        localeOptions={localeOptions}
        disabled={loading || saving || publishing}
        onLoadContent={loadContent}
      />

      <ContentStatusPanel
        labels={labels}
        currentPage={currentPage}
        entry={entry}
        locale={locale}
        publishing={publishing}
        disabled={publishing || saving || loading}
        onPublish={publishDraft}
      />

      <SeoEditor
        labels={labels}
        content={content}
        onChange={(key, value) => setContent((current) => updateSeo(current, key, value))}
      />

      <section className="builder-shell">
        <SectionSidebar
          labels={labels}
          templates={templates}
          templateDraft={templateDraft}
          templateSaving={templateSaving}
          onTemplateDraftChange={setTemplateDraft}
          onCreateTemplate={createTemplate}
          onUpdateTemplate={updateTemplate}
          onArchiveTemplate={archiveTemplate}
          onApplyTemplate={applyTemplate}
          onAddSection={addSection}
        />

        <SectionList
          labels={labels}
          sections={sections}
          selectedSection={selectedSection}
          onSelect={setSelectedSectionId}
          onDragStart={setDragIndex}
          onDrop={onDropSection}
          onMove={moveSection}
          onRemove={removeSection}
        />

        <section className="builder-panel">
          <SectionEditor
            section={selectedSection}
            labels={labels}
            uploadingSectionId={uploadingSectionId}
            onPatchSection={patchSection}
            onPatchSectionContent={patchSectionContent}
            onUploadImage={uploadImage}
          />
        </section>
      </section>

      <div className="card-actions">
        <button className="button primary" type="submit" disabled={saving || publishing || loading}>
          {saving ? labels.saving : labels.save}
        </button>
        <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
          {publishing ? labels.publishing : labels.publish}
        </button>
      </div>
      <AdminVersionTimeline
        title={labels.history}
        emptyText={labels.noHistory}
        restoreLabel={labels.restoreVersion}
        restoredLabel={labels.restored}
        failedLabel={labels.restoreFailed}
        locale={locale}
        items={snapshots.map((snapshot) => ({
          id: snapshot.id,
          title: labels.snapshotTypes?.[snapshot.snapshotType] || snapshot.snapshotType,
          meta: snapshot.summary || snapshot.actorName || snapshot.actorEmail || "",
          createdAt: snapshot.createdAt
        }))}
        onRestore={restoreSnapshot}
      />
      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
