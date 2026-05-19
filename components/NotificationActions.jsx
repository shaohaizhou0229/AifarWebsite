"use client";

import { useState } from "react";

export function NotificationActions({ notificationId, labels }) {
  const [isRead, setIsRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function markRead() {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/notifications/${notificationId}/`, { method: "PATCH" });
      if (!response.ok) throw new Error(labels.failed);
      setIsRead(true);
    } catch {
      setIsRead(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRead) return <span className="pill">{labels.read}</span>;

  return (
    <button className="button secondary compact" type="button" disabled={isSubmitting} onClick={markRead}>
      {isSubmitting ? labels.saving : labels.markRead}
    </button>
  );
}

export function MarkAllNotificationsRead({ labels }) {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function markAll() {
    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/notifications/", { method: "PATCH" });
      if (!response.ok) throw new Error(labels.failed);
      setStatus(labels.allRead);
    } catch (error) {
      setStatus(error.message || labels.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="status-actions">
      <button className="button secondary" type="button" disabled={isSubmitting} onClick={markAll}>
        {isSubmitting ? labels.saving : labels.markAllRead}
      </button>
      {status ? <span className="muted-line">{status}</span> : null}
    </div>
  );
}
