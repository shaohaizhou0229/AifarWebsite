"use client";

import { useState } from "react";
import { getTicketStatusLabel } from "@/i18n/labels";

export function AdminTicketActions({ ticket, labels }) {
  const [status, setStatus] = useState(ticket.status);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateStatus(nextStatus) {
    setFeedback({ type: "idle", message: "" });
    const response = await fetch(`/api/admin/tickets/${ticket.id}/status/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback({ type: "error", message: result.error || labels.statusFailure });
      return;
    }

    setStatus(result.ticket.status);
    setFeedback({ type: "success", message: labels.statusUpdated });
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!message.trim()) {
      setFeedback({ type: "error", message: labels.replyRequired });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "idle", message: "" });

    const response = await fetch(`/api/admin/tickets/${ticket.id}/replies/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback({ type: "error", message: result.error || labels.replyFailure });
      setIsSubmitting(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="admin-actions">
      <div className="status-actions" aria-label={labels.statusActions}>
        <span className="pill">{getTicketStatusLabel(labels, status)}</span>
        <button className="button secondary" type="button" onClick={() => updateStatus("in_progress")} disabled={status === "in_progress"}>
          {labels.markInProgress}
        </button>
        <button className="button secondary" type="button" onClick={() => updateStatus("closed")} disabled={status === "closed"}>
          {labels.closeTicket}
        </button>
      </div>
      <form className="form-shell" onSubmit={sendReply}>
        <div className="field">
          <label htmlFor="reply">{labels.reply}</label>
          <textarea id="reply" value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>
        {feedback.message ? <p className={`form-message ${feedback.type}`} role="status">{feedback.message}</p> : null}
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? labels.sending : labels.sendReply}
        </button>
      </form>
    </div>
  );
}
