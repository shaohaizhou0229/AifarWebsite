"use client";

import Link from "next/link";
import { Clock, FileText, Pencil, Plus, Send, Sparkles } from "lucide-react";
import { localizedPath } from "@/i18n/routing";
import { formatDate } from "@/components/admin-site-content/form-utils";

function pageHref(locale, path, params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `${localizedPath(locale, path)}${suffix}`;
}

function getSectionCount(content) {
  return Array.isArray(content?.sections) ? content.sections.length : 0;
}

function normalizeForCompare(value) {
  if (Array.isArray(value)) return value.map(normalizeForCompare);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((next, key) => {
      next[key] = normalizeForCompare(value[key]);
      return next;
    }, {});
}

function stableJson(value) {
  return JSON.stringify(normalizeForCompare(value || {}));
}

function hasUnpublishedDraft(entry) {
  if (!entry?.draftContent || !Object.keys(entry.draftContent).length) return false;
  if (!entry?.publishedContent) return true;
  return stableJson(entry.draftContent) !== stableJson(entry.publishedContent);
}

function hasPublishedContent(entry) {
  return Boolean(entry?.isPublished || entry?.publishedContent);
}

function getStatus(labels, entry) {
  if (hasUnpublishedDraft(entry)) {
    return {
      className: "draft",
      label: labels.pageStatusDraft || labels.draftStatus
    };
  }
  if (hasPublishedContent(entry)) {
    return {
      className: "published",
      label: labels.pageStatusReady || labels.publishedStatus
    };
  }
  return {
    className: "empty",
    label: labels.pageStatusUnpublished || labels.draftStatus
  };
}

export function AdminSiteContentOverview({
  labels,
  locale,
  contentLocale,
  localeOptions,
  pages,
  history
}) {
  const historyItems = Array.isArray(history) ? history : [];

  return (
    <section className="site-content-center">
      <div className="site-content-center-hero">
        <div>
          <p className="eyebrow">{labels.contentCenterEyebrow || labels.sections}</p>
          <h2>{labels.contentCenterTitle}</h2>
          <p>{labels.contentCenterLead}</p>
        </div>
        <div className="site-content-center-actions">
          <label>
            <span>{labels.contentLocale || labels.locale}</span>
            <select
              value={contentLocale}
              onChange={(event) => {
                window.location.href = pageHref(locale, "/admin/product/", { contentLocale: event.target.value });
              }}
            >
              {localeOptions.map((option) => (
                <option value={option.key} key={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Link className="button secondary" href={pageHref(locale, "/admin/product/designer/", { page: "home", contentLocale, mode: "new" })}>
            <Plus size={16} aria-hidden="true" />
            {labels.newHomeDesign}
          </Link>
          <Link className="button primary" href={pageHref(locale, "/admin/product/designer/", { page: "product", contentLocale, mode: "new" })}>
            <Sparkles size={16} aria-hidden="true" />
            {labels.newProductDesign}
          </Link>
        </div>
      </div>

      <div className="site-content-page-grid">
        {pages.map((item) => {
          const status = getStatus(labels, item.entry);
          return (
            <article className="site-content-page-card" key={item.key}>
              <div className="site-content-page-card-head">
                <div>
                  <p className="eyebrow">{labels.page}</p>
                  <h3>{item.label}</h3>
                </div>
                <span className={`site-content-status-pill ${status.className}`}>{status.label}</span>
              </div>
              <dl className="site-content-page-stats">
                <div>
                  <dt>{labels.sections}</dt>
                  <dd>{getSectionCount(item.content)}</dd>
                </div>
                <div>
                  <dt>{labels.updatedAt}</dt>
                  <dd>{formatDate(item.entry?.updatedAt, locale) || labels.emptyValue}</dd>
                </div>
                <div>
                  <dt>{labels.publishedAt}</dt>
                  <dd>{formatDate(item.entry?.publishedAt, locale) || labels.emptyValue}</dd>
                </div>
                <div>
                  <dt>{labels.draftStatus}</dt>
                  <dd>{hasUnpublishedDraft(item.entry) ? labels.hasDraft : labels.noDraft}</dd>
                </div>
              </dl>
              <div className="site-content-page-card-actions">
                <Link className="button secondary compact" href={pageHref(locale, "/admin/product/designer/", { page: item.key, contentLocale, mode: "edit" })}>
                  <Pencil size={15} aria-hidden="true" />
                  {labels.editDesign}
                </Link>
                <Link className="text-link" href={pageHref(contentLocale, item.publicPath)}>
                  {labels.openPublicPage}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="site-content-history-panel">
        <div className="site-content-history-head">
          <div>
            <p className="eyebrow">{labels.latestChanges}</p>
            <h3>{labels.changeHistory}</h3>
          </div>
          <Clock size={18} aria-hidden="true" />
        </div>
        {historyItems.length ? (
          <ol className="site-content-history-list">
            {historyItems.map((item) => (
              <li key={item.id}>
                <span className="site-content-history-icon">
                  {item.snapshotType === "published" ? <Send size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                </span>
                <div>
                  <strong>{item.pageLabel}</strong>
                  <p>{labels.snapshotTypes?.[item.snapshotType] || item.snapshotType}</p>
                  <small>{item.summary || item.actorName || item.actorEmail || labels.noChangeSummary}</small>
                </div>
                <time>{formatDate(item.createdAt, locale)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="site-content-empty">{labels.noChanges}</p>
        )}
      </section>
    </section>
  );
}
