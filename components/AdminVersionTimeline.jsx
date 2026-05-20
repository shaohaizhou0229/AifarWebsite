"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function AdminVersionTimeline({ title, emptyText, restoreLabel, restoredLabel, failedLabel, items = [], locale, onRestore }) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function restoreItem(item) {
    if (!item.restoreUrl && !onRestore) return;
    setRestoringId(item.id);
    setMessage("");
    setError("");

    try {
      if (onRestore) {
        await onRestore(item);
      } else {
        const response = await fetch(item.restoreUrl, { method: "POST" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || failedLabel);
        router.refresh();
      }
      setMessage(restoredLabel);
    } catch (restoreError) {
      setError(restoreError.message || failedLabel);
    } finally {
      setRestoringId("");
    }
  }

  return (
    <article className="admin-panel detail-card version-timeline">
      <h3>{title}</h3>
      {items.length ? (
        <div className="timeline-list">
          {items.map((item) => (
            <div className="timeline-item" key={item.id}>
              <span className="timeline-dot" aria-hidden="true" />
              <div>
                <strong>{item.title || item.label}</strong>
                {item.meta || item.summary ? <p>{item.meta || item.summary}</p> : null}
                <span>{formatDate(item.createdAt, locale)}</span>
              </div>
              {item.restoreUrl || onRestore ? (
                <button className="button secondary compact" type="button" onClick={() => restoreItem(item)} disabled={restoringId === item.id}>
                  {restoringId === item.id ? "..." : restoreLabel}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-line">{emptyText}</p>
      )}
      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </article>
  );
}
