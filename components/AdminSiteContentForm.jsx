"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Archive, Clock3, Edit3, Eye, Monitor, RotateCcw, Settings, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import { AssetPickerModal } from "@/components/AssetPickerModal";
import { SITE_LAYOUT_VERSION, createBlankSection } from "@/lib/site-page-builder";
import { SitePageSections } from "@/components/SitePageSections";
import { CmsToolbar } from "@/components/admin-site-content/CmsToolbar";
import { SectionEditor } from "@/components/admin-site-content/SectionEditor";
import { SectionRecognitionModal } from "@/components/admin-site-content/SectionRecognitionModal";
import { SectionSidebar } from "@/components/admin-site-content/SectionSidebar";
import { SectionTemplateMetadataModal } from "@/components/admin-site-content/SectionTemplateMetadataModal";
import { SeoEditor } from "@/components/admin-site-content/SeoEditor";
import { cloneContent, ensureLayout, formatDate, moveItem, updateSectionAt, updateSeo } from "@/components/admin-site-content/form-utils";
import promptContextRules from "@/lib/asset-prompt-context.cjs";
import imageGenerationRules from "@/lib/image-generation-settings-core.cjs";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";
import { localizedPath } from "@/i18n/routing";

const { buildSectionImagePromptContext } = promptContextRules;
const { normalizeImageSize, resolveImageTargetSize } = imageGenerationRules;
const {
  buildSectionTemplatesUrl,
  createAiCandidateTemplateSavePayload,
  createTemplateMetadataPayload,
  createTemplatePreviewPage,
  insertTemplateSection,
  isEditableTemplate
} = sectionTemplateUi;

function getSectionImageSpec(section, pathKey) {
  return section?.settings?.imageSpecs?.[pathKey] || {};
}

function SnapshotMenu({
  labels,
  locale,
  snapshots,
  disabled,
  onCreateSnapshot,
  onPreviewSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);

  async function createSnapshot() {
    setCreating(true);
    try {
      await onCreateSnapshot(summary);
      setSummary("");
    } finally {
      setCreating(false);
    }
  }

  async function runSnapshotAction(snapshot, action) {
    setBusyId(snapshot.id);
    try {
      await action(snapshot);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="snapshot-menu">
      <button className="button secondary" type="button" onClick={() => setOpen((current) => !current)} disabled={disabled}>
        <Clock3 size={16} aria-hidden="true" />
        {labels.history}
      </button>
      {open ? (
        <section className="snapshot-menu-panel" aria-label={labels.history}>
          <header className="snapshot-menu-head">
            <div>
              <p className="eyebrow">{labels.history}</p>
              <strong>{labels.snapshotList}</strong>
            </div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} title={labels.closePreview} aria-label={labels.closePreview}>
              <X size={15} aria-hidden="true" />
            </button>
          </header>
          <div className="snapshot-create-row">
            <input value={summary} placeholder={labels.snapshotName} onChange={(event) => setSummary(event.target.value)} />
            <button className="button primary compact" type="button" onClick={createSnapshot} disabled={creating || disabled}>
              {creating ? labels.saving : labels.createSnapshot}
            </button>
          </div>
          <div className="snapshot-list">
            {snapshots.length ? snapshots.map((snapshot) => (
              <article className="snapshot-row" key={snapshot.id}>
                <div>
                  <strong>{labels.snapshotTypes?.[snapshot.snapshotType] || snapshot.snapshotType}</strong>
                  <p>{snapshot.summary || snapshot.actorName || snapshot.actorEmail || labels.noChangeSummary}</p>
                  <span>{formatDate(snapshot.createdAt, locale)}</span>
                </div>
                <div className="snapshot-row-actions">
                  <button type="button" title={labels.previewSnapshot} aria-label={labels.previewSnapshot} onClick={() => onPreviewSnapshot(snapshot)}>
                    <Eye size={14} aria-hidden="true" />
                  </button>
                  <button type="button" title={labels.restoreVersion} aria-label={labels.restoreVersion} disabled={busyId === snapshot.id} onClick={() => runSnapshotAction(snapshot, onRestoreSnapshot)}>
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                  <button className="danger" type="button" title={labels.deleteSnapshot} aria-label={labels.deleteSnapshot} disabled={busyId === snapshot.id} onClick={() => runSnapshotAction(snapshot, onDeleteSnapshot)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            )) : <p className="muted-line">{labels.noHistory}</p>}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function AdminSiteContentForm({
  labels,
  assetLabels,
  adminLocale,
  imageSettings = {},
  initialPageKey,
  initialLocale,
  initialContent,
  initialSnapshots = [],
  pageOptions,
  localeOptions
}) {
  const [pageKey, setPageKey] = useState(initialPageKey);
  const [locale, setLocale] = useState(initialLocale);
  const [content, setContent] = useState(() => ensureLayout(initialContent));
  const [selectedSectionId, setSelectedSectionId] = useState(() => initialContent?.sections?.[0]?.id || "");
  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [templatePreview, setTemplatePreview] = useState(null);
  const [templateMetadataEditor, setTemplateMetadataEditor] = useState(null);
  const [templateMetadataError, setTemplateMetadataError] = useState("");
  const [templateMetadataSaving, setTemplateMetadataSaving] = useState(false);
  const [templateActionBusyId, setTemplateActionBusyId] = useState("");
  const [recognitionOpen, setRecognitionOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState(null);
  const [hoveredSectionId, setHoveredSectionId] = useState("");
  const [sectionTemplates, setSectionTemplates] = useState([]);
  const [sectionTemplatesLoading, setSectionTemplatesLoading] = useState(false);
  const [sectionTemplatesError, setSectionTemplatesError] = useState("");
  const [sectionTemplatesReloadToken, setSectionTemplatesReloadToken] = useState(0);
  const canvasPreviewRef = useRef(null);
  const modalPreviewRef = useRef(null);
  const snapshotPreviewRef = useRef(null);
  const templatePreviewRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);
  const [canvasPreviewScale, setCanvasPreviewScale] = useState(1);
  const [modalPreviewScale, setModalPreviewScale] = useState(1);
  const [snapshotPreviewScale, setSnapshotPreviewScale] = useState(1);
  const [templatePreviewScale, setTemplatePreviewScale] = useState(1);

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
    if (!previewOpen && !pageSettingsOpen && !snapshotPreview && !templatePreview && !templateMetadataEditor && !recognitionOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
        setPageSettingsOpen(false);
        setSnapshotPreview(null);
        setTemplatePreview(null);
        setTemplateMetadataEditor(null);
        setRecognitionOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen, pageSettingsOpen, snapshotPreview, templatePreview, templateMetadataEditor, recognitionOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadSectionTemplates() {
      setSectionTemplatesLoading(true);
      setSectionTemplatesError("");
      try {
        const response = await fetch(buildSectionTemplatesUrl({ locale, pageKey }));
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || labels.templateLoadFailed);
        }

        if (!cancelled) {
          setSectionTemplates(Array.isArray(data.templates) ? data.templates : []);
        }
      } catch (templateError) {
        if (!cancelled) {
          setSectionTemplatesError(templateError.message || labels.templateLoadFailed);
        }
      } finally {
        if (!cancelled) {
          setSectionTemplatesLoading(false);
        }
      }
    }

    loadSectionTemplates();
    return () => {
      cancelled = true;
    };
  }, [locale, pageKey, sectionTemplatesReloadToken, labels.templateLoadFailed]);

  useEffect(() => {
    setSnapshots(initialSnapshots);
  }, [initialSnapshots]);

  useEffect(() => {
    if (!message && !error) return undefined;
    const timer = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [message, error]);

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
    if (previewOpen) bindScaleObserver(modalPreviewRef.current, setModalPreviewScale);
    if (snapshotPreview) bindScaleObserver(snapshotPreviewRef.current, setSnapshotPreviewScale);
    if (templatePreview) bindScaleObserver(templatePreviewRef.current, setTemplatePreviewScale);
    if (!previewOpen) setModalPreviewScale(1);
    if (!snapshotPreview) setSnapshotPreviewScale(1);
    if (!templatePreview) setTemplatePreviewScale(1);

    return () => observers.forEach((observer) => observer.disconnect());
  }, [previewMode, previewOpen, snapshotPreview, templatePreview]);

  useLayoutEffect(() => {
    if (!pendingScrollRestoreRef.current) return undefined;
    const positions = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;
    const restore = () => {
      for (const { node, top, left } of positions) {
        if (!node) continue;
        node.scrollTop = top;
        node.scrollLeft = left;
      }
    };
    restore();
    const frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  });

  function captureDesignerScrollPositions() {
    const nodes = [
      document.scrollingElement,
      document.querySelector(".admin-main"),
      document.querySelector(".site-designer-inspector"),
      canvasPreviewRef.current
    ].filter(Boolean);
    return nodes.map((node) => ({
      node,
      top: node.scrollTop,
      left: node.scrollLeft
    }));
  }

  function queueDesignerScrollRestore() {
    pendingScrollRestoreRef.current = captureDesignerScrollPositions();
  }

  function updateServerState(data) {
    if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
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

      const savedContent = ensureLayout(data.content);
      setContent(savedContent);
      setSelectedSectionId((current) => current || savedContent.sections[0]?.id || "");
      updateServerState(data);
      if (showMessage) setMessage(labels.saved);
      return savedContent;
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
      updateServerState(data);
      setMessage(labels.previewPublished || labels.published);
    } catch (publishError) {
      setError(publishError.message || labels.publishFailed);
    } finally {
      setPublishing(false);
    }
  }

  function openAssetPicker(sectionId, pathKey, urlKey) {
    const targetSection = sections.find((section) => section.id === sectionId);
    const defaultSize = normalizeImageSize(imageSettings.defaultSize || "1024x1024");
    const targetSize = resolveImageTargetSize({
      sectionType: targetSection?.type || "",
      pathKey,
      spec: getSectionImageSpec(targetSection, pathKey),
      defaultSize
    });
    const promptContext = buildSectionImagePromptContext({
      pageKey,
      locale,
      section: targetSection,
      pathKey,
      size: targetSize.actualSize,
      sizeSource: targetSize.sizeSource
    });
    setAssetPickerTarget({
      sectionId,
      pathKey,
      urlKey,
      targetSize,
      defaultGenerateSize: targetSize.actualSize,
      promptContext,
      defaultPromptMode: promptContext.hasContext ? "section_context" : "manual"
    });
  }

  function selectAsset(asset) {
    if (!assetPickerTarget || !asset?.storagePath) return;
    queueDesignerScrollRestore();
    patchSection(assetPickerTarget.sectionId, (section) => ({
      ...section,
      content: {
        ...(section.content || {}),
        [assetPickerTarget.pathKey]: asset.storagePath,
        [assetPickerTarget.urlKey]: asset.url,
        ...(assetPickerTarget.pathKey === "heroImagePath"
          ? { heroAlt: section.content?.heroAlt || asset.altText || asset.filename || "" }
          : { imageAlt: section.content?.imageAlt || asset.altText || asset.filename || "" })
      }
    }));
    setMessage(labels.assetSelected || labels.uploaded);
    setAssetPickerTarget(null);
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

  function addSection(type, afterSectionId = selectedSectionId) {
    const section = createBlankSection(type);
    setContent((current) => {
      const currentSections = current.sections || [];
      const insertionIndex = currentSections.findIndex((item) => item.id === afterSectionId);
      const nextSections = [...currentSections];
      if (insertionIndex >= 0) {
        nextSections.splice(insertionIndex + 1, 0, section);
      } else {
        nextSections.push(section);
      }
      return { ...current, layoutVersion: SITE_LAYOUT_VERSION, sections: nextSections };
    });
    setSelectedSectionId(section.id);
  }

  function reloadSectionTemplates() {
    setSectionTemplatesReloadToken((current) => current + 1);
  }

  async function saveAiCandidateTemplate(candidate, draft) {
    setMessage("");
    setError("");
    const payload = createAiCandidateTemplateSavePayload(candidate, draft, { locale });

    try {
      const response = await fetch("/api/admin/site-content/section-templates/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.aiTemplateSaveFailed);
      setSectionTemplatesReloadToken((current) => current + 1);
      setMessage(labels.aiTemplateSaved);
      return data.template;
    } catch (saveError) {
      setError(saveError.message || labels.aiTemplateSaveFailed);
      throw saveError;
    }
  }

  function openTemplateMetadataEditor(template) {
    if (!isEditableTemplate(template)) return;
    setTemplateMetadataError("");
    setTemplateMetadataEditor(template);
  }

  async function updateTemplateMetadata(draft) {
    if (!templateMetadataEditor) return;
    setTemplateMetadataSaving(true);
    setTemplateMetadataError("");
    setMessage("");
    setError("");
    const payload = createTemplateMetadataPayload(draft);

    try {
      const response = await fetch(`/api/admin/site-content/section-templates/${templateMetadataEditor.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateInfoSaveFailed);
      const nextTemplate = data.template;
      setSectionTemplates((current) => current.map((template) => template.id === nextTemplate.id ? nextTemplate : template));
      setTemplatePreview((current) => current?.id === nextTemplate.id ? nextTemplate : current);
      setTemplateMetadataEditor(null);
      setMessage(labels.templateInfoSaved);
      reloadSectionTemplates();
    } catch (updateError) {
      setTemplateMetadataError(updateError.message || labels.templateInfoSaveFailed);
    } finally {
      setTemplateMetadataSaving(false);
    }
  }

  async function archiveSectionTemplate(template) {
    if (!isEditableTemplate(template)) return;
    if (!window.confirm(labels.confirmArchiveSectionTemplate)) return;

    setTemplateActionBusyId(template.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/section-templates/${template.id}/`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.templateArchiveFailed);
      setSectionTemplates((current) => current.filter((item) => item.id !== template.id));
      setTemplatePreview((current) => current?.id === template.id ? null : current);
      setTemplateMetadataEditor((current) => current?.id === template.id ? null : current);
      setMessage(labels.templateArchived);
      reloadSectionTemplates();
    } catch (archiveError) {
      setError(archiveError.message || labels.templateArchiveFailed);
    } finally {
      setTemplateActionBusyId("");
    }
  }

  function insertSectionTemplate(template, afterSectionId = selectedSectionId) {
    queueDesignerScrollRestore();
    setMessage("");
    setError("");

    try {
      const result = insertTemplateSection(sections, template, { afterSectionId });
      setContent((current) => ({
        ...current,
        layoutVersion: SITE_LAYOUT_VERSION,
        sections: result.sections
      }));
      setSelectedSectionId(result.insertedSection.id);
      setTemplatePreview(null);
      setMessage(labels.templateInserted || labels.saved);
    } catch (templateError) {
      setError(templateError.message || labels.templateInsertFailed);
    }
  }

  function duplicateSection(sectionId) {
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    const source = sections[index];
    const copy = {
      ...cloneContent(source),
      id: `${source.type}-${Date.now()}`
    };
    setContent((current) => {
      const nextSections = [...(current.sections || [])];
      nextSections.splice(index + 1, 0, copy);
      return { ...current, layoutVersion: SITE_LAYOUT_VERSION, sections: nextSections };
    });
    setSelectedSectionId(copy.id);
  }

  function removeSection(sectionId) {
    if (!window.confirm(labels.confirmRemoveSection)) return;
    const nextSections = sections.filter((section) => section.id !== sectionId);
    setContent((current) => ({ ...current, layoutVersion: SITE_LAYOUT_VERSION, sections: nextSections }));
    setSelectedSectionId((current) => current === sectionId ? nextSections[0]?.id || "" : current);
  }

  function moveSection(fromIndex, toIndex) {
    const nextSections = moveItem(sections, fromIndex, toIndex);
    setContent((current) => ({ ...current, layoutVersion: SITE_LAYOUT_VERSION, sections: nextSections }));
  }

  function onDropSection(toIndex) {
    if (dragIndex === null) return;
    moveSection(dragIndex, toIndex);
    setDragIndex(null);
  }

  async function createSnapshot(summary) {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/site-content/snapshots/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, locale, summary, content: ensureLayout(content) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.snapshotCreateFailed);
      updateServerState(data);
      setMessage(labels.snapshotCreated);
    } catch (snapshotError) {
      setError(snapshotError.message || labels.snapshotCreateFailed);
      throw snapshotError;
    }
  }

  function previewSnapshot(snapshot) {
    setSnapshotPreview({
      ...snapshot,
      content: ensureLayout(snapshot.content)
    });
  }

  async function restoreSnapshot(snapshot) {
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/snapshots/${snapshot.id}/restore/`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.restoreFailed);
      const nextContent = ensureLayout(data.content);
      setContent(nextContent);
      setSelectedSectionId(nextContent.sections[0]?.id || "");
      updateServerState(data);
      setMessage(labels.restored);
    } catch (restoreError) {
      setError(restoreError.message || labels.restoreFailed);
      throw restoreError;
    }
  }

  async function deleteSnapshot(snapshot) {
    if (!window.confirm(labels.confirmDeleteSnapshot)) return;
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/site-content/snapshots/${snapshot.id}/`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.snapshotDeleteFailed);
      updateServerState(data);
      setMessage(labels.snapshotDeleted);
    } catch (deleteError) {
      setError(deleteError.message || labels.snapshotDeleteFailed);
      throw deleteError;
    }
  }

  return (
    <form className="admin-actions site-content-designer-form" onSubmit={saveDraft}>
      <section className="site-designer-shell">
        <header className="site-designer-topbar">
          <CmsToolbar
            labels={labels}
            pageKey={pageKey}
            locale={locale}
            pageOptions={pageOptions}
            localeOptions={localeOptions}
            disabled={loading || saving || publishing}
            onLoadContent={loadContent}
          />
          <div className="site-designer-actions">
            <SnapshotMenu
              labels={labels}
              locale={locale}
              snapshots={snapshots}
              disabled={loading || saving || publishing}
              onCreateSnapshot={createSnapshot}
              onPreviewSnapshot={previewSnapshot}
              onRestoreSnapshot={restoreSnapshot}
              onDeleteSnapshot={deleteSnapshot}
            />
            <button className="button secondary" type="button" onClick={() => setPageSettingsOpen(true)}>
              <Settings size={16} aria-hidden="true" />
              {labels.pageSettings}
            </button>
            <button className="button secondary" type="button" onClick={() => setPreviewOpen(true)}>
              <Eye size={16} aria-hidden="true" />
              {labels.openPreview}
            </button>
            <button className="button site-designer-save-button" type="submit" disabled={saving || publishing || loading}>
              {saving ? labels.saving : labels.save}
            </button>
            <button className="button site-designer-publish-button" type="button" onClick={publishDraft} disabled={publishing || saving || loading}>
              {publishing ? labels.publishing : labels.publishCurrentPreview || labels.publish}
            </button>
          </div>
        </header>

        <div className="site-designer-grid">
          <aside className="site-designer-library">
            <SectionSidebar
              labels={labels}
              locale={locale}
              sectionTemplates={sectionTemplates}
              sectionTemplatesLoading={sectionTemplatesLoading}
              sectionTemplatesError={sectionTemplatesError}
              onReloadSectionTemplates={reloadSectionTemplates}
              onAddSection={addSection}
              onInsertTemplate={insertSectionTemplate}
              onPreviewTemplate={setTemplatePreview}
              onEditTemplate={openTemplateMetadataEditor}
              onArchiveTemplate={archiveSectionTemplate}
              onOpenRecognition={() => setRecognitionOpen(true)}
            />
          </aside>

          <main className="site-designer-canvas-panel">
            <div className="cms-preview-toolbar">
              <div className="cms-preview-toolbar-title">
                <p className="eyebrow">{labels.canvas}</p>
                <strong>{currentPage.label}</strong>
              </div>
              <div className={`site-designer-canvas-feedback ${message || error ? "visible" : ""}`} role={message || error ? "status" : undefined} aria-live="polite">
                {message ? <p className="form-message success">{message}</p> : null}
                {error ? <p className="form-message error">{error}</p> : null}
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
                    onMoveSection={moveSection}
                    onDuplicateSection={duplicateSection}
                    onRemoveSection={removeSection}
                    onInsertAfterSection={(sectionId, type) => addSection(type, sectionId)}
                    onDragStartSection={setDragIndex}
                    onDropSection={onDropSection}
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
              <SectionEditor
                section={selectedSection}
                labels={labels}
                defaultTargetSize={normalizeImageSize(imageSettings.defaultSize || "1024x1024")}
                onPatchSection={patchSection}
                onPatchSectionContent={patchSectionContent}
                onOpenAssetPicker={openAssetPicker}
              />
            </section>
          </aside>
        </div>
      </section>

      {pageSettingsOpen ? (
        <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.pageSettings} onPointerDown={() => setPageSettingsOpen(false)}>
          <div className="site-preview-modal-panel page-settings-modal" onPointerDown={(event) => event.stopPropagation()}>
            <header className="site-preview-modal-head">
              <div>
                <p className="eyebrow">{labels.pageSettings}</p>
                <strong>{labels.seo}</strong>
              </div>
              <button className="button secondary compact" type="button" onClick={() => setPageSettingsOpen(false)}>
                {labels.closePreview}
              </button>
            </header>
            <SeoEditor labels={labels} content={content} onChange={(key, value) => setContent((current) => updateSeo(current, key, value))} />
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.fullPreview} onPointerDown={() => setPreviewOpen(false)}>
          <div className="site-preview-modal-panel" onPointerDown={(event) => event.stopPropagation()}>
            <header className="site-preview-modal-head">
              <div>
                <p className="eyebrow">{labels.fullPreview}</p>
                <strong>{currentPage.label}</strong>
              </div>
              <button className="button secondary compact" type="button" onClick={() => setPreviewOpen(false)}>
                {labels.closePreview}
              </button>
            </header>
            <div className={`cms-live-preview site-preview-modal-canvas ${previewMode}`} ref={modalPreviewRef}>
              <div className="cms-live-preview-page" style={{ "--cms-preview-scale": modalPreviewScale }}>
                <SitePageSections page={ensureLayout(content)} locale={locale} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotPreview ? (
        <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.previewSnapshot} onPointerDown={() => setSnapshotPreview(null)}>
          <div className="site-preview-modal-panel" onPointerDown={(event) => event.stopPropagation()}>
            <header className="site-preview-modal-head">
              <div>
                <p className="eyebrow">{labels.previewSnapshot}</p>
                <strong>{snapshotPreview.summary || labels.noChangeSummary}</strong>
              </div>
              <button className="button secondary compact" type="button" onClick={() => setSnapshotPreview(null)}>
                {labels.closePreview}
              </button>
            </header>
            <div className={`cms-live-preview site-preview-modal-canvas ${previewMode}`} ref={snapshotPreviewRef}>
              <div className="cms-live-preview-page" style={{ "--cms-preview-scale": snapshotPreviewScale }}>
                <SitePageSections page={ensureLayout(snapshotPreview.content)} locale={locale} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {templatePreview ? (
        <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.templatePreview} onPointerDown={() => setTemplatePreview(null)}>
          <div className="site-preview-modal-panel template-preview-modal" onPointerDown={(event) => event.stopPropagation()}>
            <header className="site-preview-modal-head">
              <div>
                <p className="eyebrow">{labels.templatePreview}</p>
                <strong>{templatePreview.name}</strong>
              </div>
              <div className="template-preview-actions">
                {isEditableTemplate(templatePreview) ? (
                  <>
                    <button className="button secondary compact" type="button" onClick={() => openTemplateMetadataEditor(templatePreview)}>
                      <Edit3 size={15} aria-hidden="true" />
                      {labels.editTemplateInfo}
                    </button>
                    <button className="button secondary compact danger" type="button" onClick={() => archiveSectionTemplate(templatePreview)} disabled={templateActionBusyId === templatePreview.id}>
                      <Archive size={15} aria-hidden="true" />
                      {labels.archiveSectionTemplate}
                    </button>
                  </>
                ) : null}
                <button className="button primary compact" type="button" onClick={() => insertSectionTemplate(templatePreview)}>
                  {labels.insertBlock}
                </button>
                <button className="button secondary compact" type="button" onClick={() => setTemplatePreview(null)}>
                  {labels.closePreview}
                </button>
              </div>
            </header>
            <div className="template-preview-meta">
              <span>{labels.templateIndustry}: {labels.templateIndustries?.[templatePreview.industry] || templatePreview.industry}</span>
              <span>{labels.templatePurpose}: {templatePreview.purpose || labels.emptyValue}</span>
              <span>{labels.templateSource}: {labels.templateSources?.[templatePreview.source] || templatePreview.source}</span>
              <span>{labels.templateStatus}: {labels.templateStatuses?.[templatePreview.status] || templatePreview.status || labels.emptyValue}</span>
              <span>
                {labels.templatePageScope}: {templatePreview.pageKey === "home"
                  ? labels.homePage
                  : templatePreview.pageKey === "product"
                    ? labels.productPage
                    : labels.templateAllPages}
              </span>
            </div>
            {templatePreview.tags?.length ? (
              <div className="template-preview-tags" aria-label={labels.templateTags}>
                {templatePreview.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}
            {templatePreview.riskFlags?.length ? (
              <div className="template-preview-tags section-recognition-risks" aria-label={labels.aiRecognitionRisks}>
                {templatePreview.riskFlags.map((flag) => <span key={flag}>{labels.aiRiskFlags?.[flag] || flag}</span>)}
              </div>
            ) : null}
            <div className={`cms-live-preview site-preview-modal-canvas ${previewMode}`} ref={templatePreviewRef}>
              <div className="cms-live-preview-page" style={{ "--cms-preview-scale": templatePreviewScale }}>
                <SitePageSections page={createTemplatePreviewPage(templatePreview)} locale={locale} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {recognitionOpen ? (
        <SectionRecognitionModal
          labels={labels}
          locale={locale}
          pageKey={pageKey}
          pageOptions={pageOptions}
          onClose={() => setRecognitionOpen(false)}
          onInsertTemplate={insertSectionTemplate}
          onSaveTemplate={saveAiCandidateTemplate}
        />
      ) : null}

      {templateMetadataEditor ? (
        <SectionTemplateMetadataModal
          labels={labels}
          template={templateMetadataEditor}
          pageOptions={pageOptions}
          busy={templateMetadataSaving}
          error={templateMetadataError}
          onClose={() => setTemplateMetadataEditor(null)}
          onSave={updateTemplateMetadata}
        />
      ) : null}

      <AssetPickerModal
        open={Boolean(assetPickerTarget)}
        labels={assetLabels}
        locale={locale}
        initialTab="project"
        libraryHref={localizedPath(adminLocale || locale, "/admin/assets/")}
        defaultGenerateSize={assetPickerTarget?.defaultGenerateSize || normalizeImageSize(imageSettings.defaultSize || "1024x1024")}
        targetSize={assetPickerTarget?.targetSize}
        promptContext={assetPickerTarget?.promptContext}
        defaultPromptMode={assetPickerTarget?.defaultPromptMode || "manual"}
        onClose={() => setAssetPickerTarget(null)}
        onSelect={selectAsset}
      />

    </form>
  );
}
