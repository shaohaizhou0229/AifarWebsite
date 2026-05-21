"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Monitor, Smartphone, Sparkles } from "lucide-react";
import { SITE_LAYOUT_VERSION, createBlankSection, createSitePageTemplate } from "@/lib/site-page-builder";
import { AdminVersionTimeline } from "@/components/AdminVersionTimeline";
import { SitePageSections } from "@/components/SitePageSections";
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
  localeOptions,
  mode = "edit",
  backHref = ""
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
  const [previewMode, setPreviewMode] = useState("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hoveredSectionId, setHoveredSectionId] = useState("");
  const canvasPreviewRef = useRef(null);
  const modalPreviewRef = useRef(null);
  const [canvasPreviewScale, setCanvasPreviewScale] = useState(1);
  const [modalPreviewScale, setModalPreviewScale] = useState(1);

  const currentPage = useMemo(
    () => pageOptions.find((option) => option.key === pageKey) || pageOptions[0],
    [pageKey, pageOptions]
  );
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0] || null;

  useEffect(() => {
    const shell = document.querySelector(".admin-shell");
    shell?.classList.add("admin-designer-focus");
    const requestSidebarCollapse = () => {
      window.dispatchEvent(new CustomEvent("aifar-admin-sidebar:set-collapsed", { detail: { collapsed: true } }));
    };
    requestSidebarCollapse();
    const animationFrame = window.requestAnimationFrame(requestSidebarCollapse);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      shell?.classList.remove("admin-designer-focus");
    };
  }, []);

  useEffect(() => {
    if (!previewOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setPreviewOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  useEffect(() => {
    setSnapshots(initialSnapshots);
    setTemplates(initialTemplates);
  }, [initialSnapshots, initialTemplates]);

  useEffect(() => {
    const targetWidth = previewMode === "mobile" ? 390 : 1120;
    const minScale = previewMode === "mobile" ? 0.78 : 0.54;
    const observers = [];

    function bindScaleObserver(node, setter) {
      if (!node) return;

      function updateScale() {
        const availableWidth = Math.max(node.clientWidth - 24, 1);
        setter(Math.min(1, Math.max(minScale, availableWidth / targetWidth)));
      }

      updateScale();
      const observer = new ResizeObserver(updateScale);
      observer.observe(node);
      observers.push(observer);
    }

    bindScaleObserver(canvasPreviewRef.current, setCanvasPreviewScale);
    if (previewOpen) {
      bindScaleObserver(modalPreviewRef.current, setModalPreviewScale);
    } else {
      setModalPreviewScale(1);
    }

    return () => observers.forEach((observer) => observer.disconnect());
  }, [previewMode, previewOpen]);

  function updateServerState(data) {
    if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
    if (Array.isArray(data.templates)) setTemplates(data.templates);
  }

  function getTemplatePreviewContent(template) {
    if (template.isSystem) {
      return createSitePageTemplate(template.key, pageKey, content);
    }
    return {
      ...(template.content || {}),
      seo: template.includeSeo ? template.content?.seo : content.seo
    };
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

  async function saveDraftContent(nextContent = content, showMessage = true) {
    setSaving(true);
    if (showMessage) setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/site-content/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale, content: ensureLayout(nextContent) })
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
      if (showMessage) setMessage(labels.saved);
      return nextContent;
    } catch (saveError) {
      setError(saveError.message || labels.saveFailed);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event) {
    event.preventDefault();
    await saveDraftContent(content, true).catch(() => null);
  }

  async function publishDraft() {
    setPublishing(true);
    setMessage("");
    setError("");

    try {
      await saveDraftContent(content, false);
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
      setMessage(labels.previewPublished || labels.published);
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

  async function applyTemplate(templateRecord, includeSeo) {
    setTemplateSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/templates/${templateRecord.id}/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageKey,
          locale,
          includeSeo
        })
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
      return true;
    } catch (templateError) {
      setError(templateError.message || labels.templateSaveFailed);
      return false;
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
    <form className="admin-actions site-content-designer-form" onSubmit={saveDraft}>
      <section className="site-designer-shell">
        <header className="site-designer-topbar">
          <div className="site-designer-return">
            {backHref ? (
              <Link className="icon-text-link" href={backHref}>
                <ArrowLeft size={16} aria-hidden="true" />
                {labels.backToContentCenter}
              </Link>
            ) : null}
            <div>
              <p className="eyebrow">{mode === "new" ? labels.modeNew : labels.modeEdit}</p>
              <strong>{currentPage.label}</strong>
            </div>
          </div>
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
            saving={saving}
            publishing={publishing}
            disabled={publishing || saving || loading}
            onPublish={publishDraft}
            showAction={false}
          />
          <div className="site-designer-actions">
            <button className="button secondary" type="button" onClick={() => setPreviewOpen(true)}>
              <Eye size={16} aria-hidden="true" />
              {labels.openPreview}
            </button>
            <button className="button primary" type="submit" disabled={saving || publishing || loading}>
              {saving ? labels.saving : labels.save}
            </button>
            <button className="button secondary" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
              {publishing ? labels.publishing : labels.publishCurrentPreview || labels.publish}
            </button>
          </div>
        </header>

        <div className="site-designer-grid">
          <aside className="site-designer-library">
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
              getTemplatePreviewContent={getTemplatePreviewContent}
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
          </aside>

          <main className="site-designer-canvas-panel">
            <div className="cms-preview-toolbar">
              <div>
                <p className="eyebrow">{labels.canvas}</p>
                <strong>{currentPage.label}</strong>
              </div>
              <div className="preview-mode-toggle" aria-label={labels.previewMode}>
                <button type="button" className={previewMode === "desktop" ? "active" : ""} onClick={() => setPreviewMode("desktop")} title={labels.desktopPreview}>
                  <Monitor size={15} aria-hidden="true" />
                  <span>{labels.desktopPreview}</span>
                </button>
                <button type="button" className={previewMode === "mobile" ? "active" : ""} onClick={() => setPreviewMode("mobile")} title={labels.mobilePreview}>
                  <Smartphone size={15} aria-hidden="true" />
                  <span>{labels.mobilePreview}</span>
                </button>
              </div>
            </div>
            <div className={`cms-live-preview site-designer-canvas ${previewMode}`} ref={canvasPreviewRef}>
              {sections.length ? (
                <div className="cms-live-preview-page" style={{ "--cms-preview-scale": canvasPreviewScale }}>
                  <SitePageSections
                    page={ensureLayout(content)}
                    locale={locale}
                    editorMode
                    labels={labels}
                    selectedSectionId={selectedSectionId}
                    hoveredSectionId={hoveredSectionId}
                    onSelectSection={setSelectedSectionId}
                    onHoverSection={setHoveredSectionId}
                  />
                </div>
              ) : (
                <div className="site-designer-empty-canvas">
                  <Sparkles size={28} aria-hidden="true" />
                  <strong>{labels.emptyPreview}</strong>
                  <p>{labels.startBlankHint}</p>
                </div>
              )}
            </div>
          </main>

          <aside className="site-designer-inspector">
            <section className="builder-panel">
              <div className="builder-panel-head">
                <p className="eyebrow">{labels.selectedBlock}</p>
                <strong>{selectedSection ? labels.sectionTypes?.[selectedSection.type] : labels.noSectionSelected}</strong>
              </div>
              <SectionEditor
                section={selectedSection}
                labels={labels}
                uploadingSectionId={uploadingSectionId}
                onPatchSection={patchSection}
                onPatchSectionContent={patchSectionContent}
                onUploadImage={uploadImage}
              />
            </section>
            <SeoEditor
              labels={labels}
              content={content}
              onChange={(key, value) => setContent((current) => updateSeo(current, key, value))}
            />
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
          </aside>
        </div>
      </section>

      {previewOpen ? (
        <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.fullPreview} onPointerDown={() => setPreviewOpen(false)}>
          <div className="site-preview-modal-panel" onPointerDown={(event) => event.stopPropagation()}>
            <header className="site-preview-modal-head">
              <div>
                <p className="eyebrow">{labels.fullPreview}</p>
                <strong>{currentPage.label}</strong>
              </div>
              <div className="site-preview-modal-actions">
                <div className="preview-mode-toggle" aria-label={labels.previewMode}>
                  <button type="button" className={previewMode === "desktop" ? "active" : ""} onClick={() => setPreviewMode("desktop")}>
                    {labels.desktopPreview}
                  </button>
                  <button type="button" className={previewMode === "mobile" ? "active" : ""} onClick={() => setPreviewMode("mobile")}>
                    {labels.mobilePreview}
                  </button>
                </div>
                <button className="button secondary compact" type="button" onClick={() => setPreviewOpen(false)}>
                  {labels.closePreview}
                </button>
              </div>
            </header>
            <div className={`cms-live-preview site-preview-modal-canvas ${previewMode}`} ref={modalPreviewRef}>
              <div className="cms-live-preview-page" style={{ "--cms-preview-scale": modalPreviewScale }}>
                <SitePageSections
                  page={ensureLayout(content)}
                  locale={locale}
                  editorMode
                  labels={labels}
                  selectedSectionId={selectedSectionId}
                  hoveredSectionId={hoveredSectionId}
                  onSelectSection={setSelectedSectionId}
                  onHoverSection={setHoveredSectionId}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </form>
  );
}
