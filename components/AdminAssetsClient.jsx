"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, CheckSquare, FolderOpen, Image as ImageIcon, RefreshCw, Search, Sparkles, Tag, UploadCloud, X } from "lucide-react";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { AssetPickerModal } from "@/components/AssetPickerModal";

const ASSET_LIMIT = 48;
const SOURCE_OPTIONS = ["upload", "folder_upload", "generated"];

function t(labels, key) {
  return labels?.[key] || key;
}

function formatTemplate(template = "", values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
}

function formatBytes(bytes, labels) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} ${labels.units?.mb || "MB"}`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} ${labels.units?.kb || "KB"}`;
  return `${size} ${labels.units?.bytes || "B"}`;
}

function formatDate(value, locale) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function splitTags(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTags(tags = []) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function localizeAdminHref(locale, href = "") {
  if (!href.startsWith("/admin/")) return href;
  return `/${locale}${href}`;
}

function AssetLibraryCard({ asset, labels, locale, selected, checked, onSelect, onToggle }) {
  return (
    <article className={`admin-asset-card ${selected ? "selected" : ""}`}>
      <label className="admin-asset-check" title={t(labels, "selectForBatch")}>
        <input checked={checked} type="checkbox" onChange={() => onToggle(asset.id)} />
        <span aria-hidden="true">{checked ? <CheckSquare size={14} /> : null}</span>
      </label>
      <button type="button" onClick={() => onSelect(asset)}>
        <span className="admin-asset-thumb">
          {asset.url ? <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} loading="lazy" /> : <ImageIcon size={28} aria-hidden="true" />}
        </span>
        <span className="admin-asset-copy">
          <strong title={asset.displayName || asset.originalFilename}>{asset.displayName || asset.originalFilename}</strong>
          <small>{[asset.directoryPath || t(labels, "uncategorized"), labels.sourceLabels?.[asset.source] || asset.source].filter(Boolean).join(" / ")}</small>
          <small>{[formatBytes(asset.fileSize, labels), formatDate(asset.updatedAt, locale)].filter(Boolean).join(" / ")}</small>
        </span>
      </button>
    </article>
  );
}

function AssetDetail({ asset, labels, locale, folders, saving, usageState, onSave }) {
  const [draft, setDraft] = useState({ displayName: "", altText: "", directoryPath: "", tags: "" });

  useEffect(() => {
    setDraft({
      displayName: asset?.displayName || asset?.originalFilename || "",
      altText: asset?.altText || "",
      directoryPath: asset?.directoryPath || "",
      tags: joinTags(asset?.tags)
    });
  }, [asset]);

  if (!asset) {
    return (
      <aside className="admin-asset-detail empty">
        <ImageIcon size={24} aria-hidden="true" />
        <p>{t(labels, "selectAssetHint")}</p>
      </aside>
    );
  }

  const metadata = asset.metadata || {};

  return (
    <aside className="admin-asset-detail">
      <div className="admin-asset-preview">
        <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} />
      </div>
      <dl className="admin-asset-meta">
        <div>
          <dt>{t(labels, "source")}</dt>
          <dd>{labels.sourceLabels?.[asset.source] || asset.source}</dd>
        </div>
        <div>
          <dt>{t(labels, "size")}</dt>
          <dd>{asset.width && asset.height ? `${asset.width} x ${asset.height}` : formatBytes(asset.fileSize, labels)}</dd>
        </div>
        <div>
          <dt>{t(labels, "updatedAt")}</dt>
          <dd>{formatDate(asset.updatedAt, locale) || "-"}</dd>
        </div>
      </dl>
      <label className="asset-field">
        <span>{t(labels, "displayName")}</span>
        <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "altText")}</span>
        <input value={draft.altText} onChange={(event) => setDraft((current) => ({ ...current, altText: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "directoryPath")}</span>
        <select value={draft.directoryPath} onChange={(event) => setDraft((current) => ({ ...current, directoryPath: event.target.value }))}>
          <option value="">{t(labels, "uncategorized")}</option>
          {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
        </select>
      </label>
      <label className="asset-field">
        <span>{t(labels, "tags")}</span>
        <input value={draft.tags} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
      </label>
      <button className="button primary compact" type="button" onClick={() => onSave(asset, { ...draft, tags: splitTags(draft.tags) })} disabled={saving || !draft.displayName.trim()}>
        {saving ? t(labels, "saving") : t(labels, "saveMetadata")}
      </button>

      {asset.source === "generated" ? (
        <section className="admin-asset-info-block">
          <span className="admin-eyebrow">{t(labels, "generationHistory")}</span>
          <p>{metadata.prompt || asset.altText || t(labels, "notProvided")}</p>
          <small>{[metadata.model, metadata.size, metadata.quality].filter(Boolean).join(" / ")}</small>
        </section>
      ) : null}

      <section className="admin-asset-info-block">
        <span className="admin-eyebrow">{t(labels, "usageTitle")}</span>
        {usageState?.loading ? (
          <p>{t(labels, "usageLoading")}</p>
        ) : usageState?.error ? (
          <p className="error">{usageState.error}</p>
        ) : usageState?.items?.length ? (
          <ul className="admin-asset-usage-list">
            {usageState.items.map((item) => (
              <li key={item.id}>
                <a href={localizeAdminHref(locale, item.href)}>
                  <strong>{item.title || t(labels, "notProvided")}</strong>
                  <span>
                    {[labels.usageSourceLabels?.[item.sourceType] || item.sourceType, labels.usageStatusLabels?.[item.status] || item.status, item.locale, item.detail].filter(Boolean).join(" / ")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t(labels, "usageNone")}</p>
        )}
      </section>
    </aside>
  );
}

export function AdminAssetsClient({ locale, page, assetLabels, initialData = null, loadingLabel, errorLabel, defaultGenerateSize = "1024x1024" }) {
  const skipInitialFetch = useRef(Boolean(initialData));
  const [data, setData] = useState(initialData || { assets: [], folders: [], folderItems: [], tags: [], total: 0, page: 1 });
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(initialData?.assets?.[0] || null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkFolder, setBulkFolder] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState("project");
  const [usageState, setUsageState] = useState({ assetId: "", loading: false, error: "", items: [] });

  const folders = data.folders || data.directories || [];
  const tags = data.tags || [];
  const checkedIds = useMemo(() => new Set(selectedIds), [selectedIds]);
  const currentPage = Number(data.page || pageNumber || 1);
  const totalPages = Math.max(1, Math.ceil(Number(data.total || 0) / ASSET_LIMIT));
  const generatedVisible = (data.assets || []).filter((asset) => asset.source === "generated").length;

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(ASSET_LIMIT));
      params.set("page", String(pageNumber));
      if (query.trim()) params.set("q", query.trim());
      if (directory) params.set("directory", directory);
      if (source) params.set("source", source);
      if (tag) params.set("tag", tag);
      const response = await fetch(`/api/admin/assets/?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.code === "assetManagerBusy" ? t(assetLabels, "loadBusy") : result.error || errorLabel);
      setData(result);
      setSelectedAsset((current) => {
        if (current && result.assets?.some((asset) => asset.id === current.id)) {
          return result.assets.find((asset) => asset.id === current.id);
        }
        return result.assets?.[0] || null;
      });
    } catch (loadError) {
      setError(loadError.message || errorLabel);
    } finally {
      setLoading(false);
    }
  }, [assetLabels, directory, errorLabel, pageNumber, query, source, tag]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return undefined;
    }
    const timer = window.setTimeout(loadAssets, 180);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  useEffect(() => {
    setPageNumber(1);
    setSelectedIds([]);
  }, [directory, query, source, tag]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const assetId = selectedAsset?.id || "";
    if (!assetId) {
      setUsageState({ assetId: "", loading: false, error: "", items: [] });
      return undefined;
    }

    const controller = new AbortController();
    setUsageState({ assetId, loading: true, error: "", items: [] });

    fetch(`/api/admin/assets/${assetId}/usage/`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || t(assetLabels, "usageLoadFailed"));
        setUsageState({ assetId, loading: false, error: "", items: result.usage || [] });
      })
      .catch((usageError) => {
        if (usageError.name === "AbortError") return;
        setUsageState({ assetId, loading: false, error: usageError.message || t(assetLabels, "usageLoadFailed"), items: [] });
      });

    return () => controller.abort();
  }, [assetLabels, selectedAsset?.id]);

  function toggleAsset(assetId) {
    setSelectedIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  }

  function openPicker(tabName) {
    setPickerTab(tabName);
    setPickerOpen(true);
  }

  function selectFromPicker(asset) {
    if (asset) {
      setSelectedAsset(asset);
      setMessage(t(assetLabels, "assetSelected"));
    }
    setPickerOpen(false);
    loadAssets();
  }

  async function saveAsset(asset, draft) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/assets/${asset.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t(assetLabels, "saveFailed"));
      setSelectedAsset(result.asset);
      setData((current) => ({
        ...current,
        assets: (current.assets || []).map((item) => item.id === result.asset.id ? result.asset : item),
        folders: Array.from(new Set([...(current.folders || []), result.asset.directoryPath].filter(Boolean))).sort()
      }));
      setMessage(t(assetLabels, "metadataSaved"));
    } catch (saveError) {
      setError(saveError.message || t(assetLabels, "saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function applyBulk(action) {
    if (!selectedIds.length) return;
    if (action === "archive" && !window.confirm(formatTemplate(t(assetLabels, "deleteConfirm"), { count: selectedIds.length }))) {
      return;
    }
    setBulkSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/assets/bulk/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          assetIds: selectedIds,
          directoryPath: bulkFolder,
          tags: splitTags(bulkTags),
          tagMode: "append"
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t(assetLabels, "bulkFailed"));
      setSelectedIds([]);
      setBulkFolder("");
      setBulkTags("");
      setMessage(t(assetLabels, "bulkUpdated"));
      await loadAssets();
    } catch (bulkError) {
      setError(bulkError.message || t(assetLabels, "bulkFailed"));
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <section className="admin-asset-library">
        <div className="admin-asset-kpis">
          <article>
            <span>{page.metrics.totalAssets}</span>
            <strong>{Number(data.total || 0)}</strong>
          </article>
          <article>
            <span>{page.metrics.generatedVisible}</span>
            <strong>{generatedVisible}</strong>
          </article>
          <article>
            <span>{page.metrics.folders}</span>
            <strong>{folders.length}</strong>
          </article>
          <article>
            <span>{page.metrics.tags}</span>
            <strong>{tags.length}</strong>
          </article>
        </div>

        <div className="admin-asset-actions">
          <button className="button primary" type="button" onClick={() => openPicker("project")}>
            <UploadCloud size={16} aria-hidden="true" />
            {page.actions.upload}
          </button>
          <button className="button secondary" type="button" onClick={() => openPicker("generate")}>
            <Sparkles size={16} aria-hidden="true" />
            {page.actions.generate}
          </button>
          <button className="icon-button" type="button" onClick={loadAssets} title={t(assetLabels, "refresh")} aria-label={t(assetLabels, "refresh")}>
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="admin-asset-filter" onSubmit={(event) => event.preventDefault()}>
          <label>
            <Search size={15} aria-hidden="true" />
            <input value={query} placeholder={t(assetLabels, "searchPlaceholder")} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select value={directory} onChange={(event) => setDirectory(event.target.value)} aria-label={t(assetLabels, "directoryPath")}>
            <option value="">{t(assetLabels, "allDirectories")}</option>
            {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
          </select>
          <select value={source} onChange={(event) => setSource(event.target.value)} aria-label={t(assetLabels, "source")}>
            <option value="">{t(assetLabels, "allSources")}</option>
            {SOURCE_OPTIONS.map((item) => <option value={item} key={item}>{assetLabels.sourceLabels?.[item] || item}</option>)}
          </select>
          <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label={t(assetLabels, "tags")}>
            <option value="">{t(assetLabels, "allTags")}</option>
            {tags.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </form>

        {(message || error) ? (
          <div className="admin-asset-feedback" role="status" aria-live="polite">
            {message ? <p className="form-message success">{message}</p> : null}
            {error ? <p className="form-message error">{error}</p> : null}
          </div>
        ) : null}

        <div className="admin-asset-workspace">
          <aside className="admin-asset-folders">
            <button className={!directory ? "active" : ""} type="button" onClick={() => setDirectory("")}>
              <FolderOpen size={15} aria-hidden="true" />
              <span>{t(assetLabels, "allDirectories")}</span>
            </button>
            {(data.folderItems || []).map((folder) => (
              <button className={directory === folder.directoryPath ? "active" : ""} type="button" key={folder.directoryPath} onClick={() => setDirectory(folder.directoryPath)}>
                <FolderOpen size={15} aria-hidden="true" />
                <span>{folder.displayName || folder.directoryPath}</span>
                <small>{folder.assetCount}</small>
              </button>
            ))}
          </aside>

          <main className="admin-asset-main">
            {selectedIds.length ? (
              <div className="admin-asset-bulk">
                <strong>{formatTemplate(t(assetLabels, "selectedCount"), { count: selectedIds.length })}</strong>
                <select value={bulkFolder} onChange={(event) => setBulkFolder(event.target.value)} aria-label={t(assetLabels, "targetFolder")}>
                  <option value="">{t(assetLabels, "uncategorized")}</option>
                  {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
                </select>
                <button type="button" onClick={() => applyBulk("move")} disabled={bulkSaving}>
                  <FolderOpen size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkMove")}
                </button>
                <input value={bulkTags} placeholder={t(assetLabels, "tagNamePlaceholder")} onChange={(event) => setBulkTags(event.target.value)} />
                <button type="button" onClick={() => applyBulk("tags")} disabled={bulkSaving || !bulkTags.trim()}>
                  <Tag size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkTags")}
                </button>
                <button className="danger" type="button" onClick={() => applyBulk("archive")} disabled={bulkSaving}>
                  <Archive size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkDelete")}
                </button>
                <button type="button" onClick={() => setSelectedIds([])} aria-label={t(assetLabels, "clearSelection")}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
              {(data.assets || []).length ? (
                <div className="admin-asset-grid">
                  {(data.assets || []).map((asset) => (
                    <AssetLibraryCard
                      asset={asset}
                      checked={checkedIds.has(asset.id)}
                      key={asset.id}
                      labels={assetLabels}
                      locale={locale}
                      selected={selectedAsset?.id === asset.id}
                      onSelect={setSelectedAsset}
                      onToggle={toggleAsset}
                    />
                  ))}
                </div>
              ) : (
                <article className="admin-panel admin-empty-state">
                  <h2>{page.emptyTitle}</h2>
                  <p>{page.emptyLead}</p>
                </article>
              )}
            </AdminAsyncState>

            {Number(data.total || 0) > ASSET_LIMIT ? (
              <div className="admin-asset-pagination">
                <button className="button secondary compact" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
                  {t(assetLabels, "previousPage")}
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button className="button secondary compact" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => current + 1)}>
                  {t(assetLabels, "nextPage")}
                </button>
              </div>
            ) : null}
          </main>

          <AssetDetail asset={selectedAsset} labels={assetLabels} locale={locale} folders={folders} saving={saving} usageState={usageState} onSave={saveAsset} />
        </div>
      </section>

      <AssetPickerModal
        open={pickerOpen}
        labels={assetLabels}
        locale={locale}
        initialTab={pickerTab}
        defaultGenerateSize={defaultGenerateSize}
        onClose={() => {
          setPickerOpen(false);
          loadAssets();
        }}
        onSelect={selectFromPicker}
      />
    </>
  );
}
