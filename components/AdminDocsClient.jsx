"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { localizedPath } from "@/i18n/routing";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function categoryLabel(page, categoryKey, fallback) {
  return page.categories?.[categoryKey]?.label || fallback || categoryKey;
}

export function AdminDocsClient({ locale, page, loadingLabel, errorLabel }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/docs/?limit=20");
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        if (!cancelled) setDocuments(result.documents || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [errorLabel]);

  return (
    <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
      <div className="admin-table-list">
        {documents.map((document) => (
          <Link className="admin-table-row" key={document.id} href={localizedPath(locale, `/admin/docs/${document.id}/`)} prefetch={false}>
            <div>
              <h3>{document.title}</h3>
              <p>{document.summary || page.noSummary}</p>
            </div>
            <span>{categoryLabel(page, document.categoryKey, document.categoryLabel)}</span>
            <span>{document.currentVersionLabel || page.noVersion}</span>
            <span className="admin-status admin-status-neutral">{document.isPublished ? page.published : page.draft}</span>
            <time>{formatDate(document.updatedAt, locale)}</time>
          </Link>
        ))}
        {!documents.length ? (
          <article className="admin-panel admin-empty-state">
            <span className="admin-status admin-status-neutral">{page.emptyStatus}</span>
            <h2>{page.emptyTitle}</h2>
            <p>{page.emptyLead}</p>
          </article>
        ) : null}
      </div>
    </AdminAsyncState>
  );
}
