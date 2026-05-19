"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotificationActions({ notificationId, labels, url = "", isAlreadyRead = false }) {
  const router = useRouter();
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

  async function viewDetail() {
    if (!url) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/notifications/${notificationId}/`, { method: "PATCH" });
      if (!response.ok) throw new Error(labels.failed);
      setIsRead(true);
      router.push(url);
    } catch {
      setIsRead(false);
      setIsSubmitting(false);
    }
  }

  if (url) {
    return (
      <button className="button secondary compact" type="button" disabled={isSubmitting} onClick={viewDetail}>
        {isSubmitting ? labels.opening : labels.viewDetail}
      </button>
    );
  }

  if (isRead || isAlreadyRead) return null;

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
