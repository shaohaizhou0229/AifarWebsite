"use client";

import { useState } from "react";

export function AdminTicketActions({ ticket }) {
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
      setFeedback({ type: "error", message: result.error || "Unable to update status." });
      return;
    }

    setStatus(result.ticket.status);
    setFeedback({ type: "success", message: "Ticket status updated." });
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!message.trim()) {
      setFeedback({ type: "error", message: "Reply message is required." });
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
      setFeedback({ type: "error", message: result.error || "Unable to send reply." });
      setIsSubmitting(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="admin-actions">
      <div className="status-actions" aria-label="Ticket status actions">
        <span className="pill">{status.replace("_", " ")}</span>
        <button className="button secondary" type="button" onClick={() => updateStatus("in_progress")} disabled={status === "in_progress"}>
          Mark in progress
        </button>
        <button className="button secondary" type="button" onClick={() => updateStatus("closed")} disabled={status === "closed"}>
          Close ticket
        </button>
      </div>
      <form className="form-shell" onSubmit={sendReply}>
        <div className="field">
          <label htmlFor="reply">Reply</label>
          <textarea id="reply" value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>
        {feedback.message ? <p className={`form-message ${feedback.type}`} role="status">{feedback.message}</p> : null}
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reply"}
        </button>
      </form>
    </div>
  );
}
