"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { localizedPath } from "@/i18n/routing";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function resolveNotificationHref(locale, url = "") {
  const value = String(url || "").trim();
  if (!value) return localizedPath(locale, "/admin/");

  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith(`/${locale}/admin/`) || parsed.pathname.startsWith(`/${locale}/account/`)
      ? `${parsed.pathname}${parsed.search}`
      : value;
  } catch {
    if (value.startsWith(`/${locale}/`)) return value;
    if (value.startsWith("/admin/")) {
      const [pathname, query = ""] = value.split("?");
      return `${localizedPath(locale, pathname)}${query ? `?${query}` : ""}`;
    }
    return value || localizedPath(locale, "/admin/");
  }
}

export function AdminNotificationsClient({ locale, labels, loadingLabel, errorLabel }) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/notifications/?scope=admin&status=${status}&limit=50`, {
          credentials: "same-origin"
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || errorLabel);
        if (!cancelled) setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [errorLabel, status]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  async function markRead(ids) {
    if (!ids.length) return [];
    const actionId = ids.length === 1 ? ids[0] : "all";
    setSubmitting(actionId);
    try {
      const response = await fetch(`/api/admin/notifications/?scope=admin&status=${status}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || labels.actions.failed);
      const updatedIds = new Set((payload.notifications || []).map((notification) => notification.id));
      setNotifications((current) => current
        .map((notification) => updatedIds.has(notification.id) ? { ...notification, readAt: notification.readAt || new Date().toISOString() } : notification)
        .filter((notification) => status !== "unread" || !updatedIds.has(notification.id)));
      return payload.notifications || [];
    } catch (markError) {
      setError(markError.message || labels.actions.failed);
      return [];
    } finally {
      setSubmitting("");
    }
  }

  async function openNotification(notification) {
    if (!notification.readAt) {
      const updated = await markRead([notification.id]);
      if (!updated.length) return;
    }
    router.push(resolveNotificationHref(locale, notification.url));
  }

  return (
    <section className="admin-panel admin-notifications-panel">
      <header className="admin-notifications-toolbar">
        <div className="admin-panel-tabs" aria-label={labels.filtersLabel}>
          <button type="button" className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>
            {labels.filters.all}
          </button>
          <button type="button" className={status === "unread" ? "active" : ""} onClick={() => setStatus("unread")}>
            {labels.filters.unread}
          </button>
        </div>
        <button
          className="button secondary compact"
          type="button"
          disabled={!unreadCount || submitting === "all"}
          onClick={() => markRead(notifications.filter((notification) => !notification.readAt).map((notification) => notification.id))}
        >
          {submitting === "all" ? labels.actions.saving : labels.actions.markAllRead}
        </button>
      </header>

      {loading ? (
        <p className="admin-empty-copy" aria-busy="true">{loadingLabel}</p>
      ) : error ? (
        <article className="admin-empty-state">
          <h2>{errorLabel}</h2>
          <p>{error}</p>
        </article>
      ) : notifications.length ? (
        <div className="admin-notifications-list">
          {notifications.map((notification) => (
            <article className={`admin-notification-row ${notification.readAt ? "is-read" : "is-unread"}`} key={notification.id}>
              <span className="admin-notification-icon">
                {notification.readAt ? <CheckCircle2 aria-hidden="true" size={16} strokeWidth={1.8} /> : <Bell aria-hidden="true" size={16} strokeWidth={1.8} />}
              </span>
              <div>
                <div className="admin-notification-row-head">
                  <strong>{notification.title}</strong>
                  <AdminStatusPill tone={notification.readAt ? "good" : "attention"}>
                    {notification.readAt ? labels.read : labels.unread}
                  </AdminStatusPill>
                </div>
                <p>{notification.body}</p>
                <time>{formatDate(notification.createdAt, locale)}</time>
              </div>
              <button
                className="admin-inline-action"
                type="button"
                disabled={submitting === notification.id}
                onClick={() => openNotification(notification)}
              >
                {submitting === notification.id ? labels.actions.saving : labels.actions.open}
                <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <article className="admin-empty-state">
          <h2>{labels.emptyTitle}</h2>
          <p>{labels.emptyLead}</p>
        </article>
      )}
    </section>
  );
}
