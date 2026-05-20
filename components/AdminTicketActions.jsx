"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTicketCategoryLabel, getTicketPriorityLabel, getTicketStatusLabel } from "@/i18n/labels";

const STATUS_OPTIONS = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const CATEGORY_OPTIONS = ["account_access", "client_download", "installation", "product_usage", "bug_report", "partnership", "other"];

export function AdminTicketActions({ ticket, labels, profiles = [], internalNotes = [] }) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority || "normal");
  const [category, setCategory] = useState(ticket.category || "other");
  const [assigneeUserId, setAssigneeUserId] = useState(ticket.assigneeUserId || "");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  async function updateTicket(payload) {
    setFeedback({ type: "idle", message: "" });
    setIsSaving(true);
    const response = await fetch(`/api/admin/tickets/${ticket.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: result.error || labels.updateFailure });
      return;
    }

    setStatus(result.ticket.status);
    setPriority(result.ticket.priority);
    setCategory(result.ticket.category);
    setAssigneeUserId(result.ticket.assigneeUserId || "");
    setFeedback({ type: "success", message: labels.ticketUpdated });
  }

  function updateStatus(nextStatus) {
    updateTicket({ status: nextStatus });
  }

  function saveMetadata(event) {
    event.preventDefault();
    updateTicket({ status, priority, category, assigneeUserId });
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

    setMessage("");
    setIsSubmitting(false);
    router.refresh();
  }

  async function addNote(event) {
    event.preventDefault();

    if (!note.trim()) {
      setFeedback({ type: "error", message: labels.noteRequired });
      return;
    }

    setIsAddingNote(true);
    setFeedback({ type: "idle", message: "" });

    const response = await fetch(`/api/admin/tickets/${ticket.id}/internal-notes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: note })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback({ type: "error", message: result.error || labels.noteFailure });
      setIsAddingNote(false);
      return;
    }

    setNote("");
    setIsAddingNote(false);
    router.refresh();
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
      <form className="ticket-control-grid" onSubmit={saveMetadata}>
        <div className="field">
          <label htmlFor="ticketStatus">{labels.status}</label>
          <select id="ticketStatus" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketStatusLabel(labels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ticketPriority">{labels.priority}</label>
          <select id="ticketPriority" value={priority} onChange={(event) => setPriority(event.target.value)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketPriorityLabel(labels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ticketCategory">{labels.category}</label>
          <select id="ticketCategory" value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{getTicketCategoryLabel(labels, option)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ticketAssignee">{labels.assignee}</label>
          <select id="ticketAssignee" value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)}>
            <option value="">{labels.unassigned}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.displayName || profile.email}</option>
            ))}
          </select>
        </div>
        <button className="button primary" type="submit" disabled={isSaving}>
          {isSaving ? labels.saving : labels.saveChanges}
        </button>
      </form>
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
      <form className="form-shell internal-note-form" onSubmit={addNote}>
        <div className="field">
          <label htmlFor="internalNote">{labels.internalNote}</label>
          <textarea id="internalNote" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <button className="button secondary" type="submit" disabled={isAddingNote}>
          {isAddingNote ? labels.saving : labels.addNote}
        </button>
      </form>
      <div className="internal-note-list">
        <h3>{labels.internalNotes}</h3>
        {internalNotes.length ? internalNotes.map((item) => (
          <article className="internal-note" key={item.id}>
            <p>{item.message}</p>
            <span>{item.authorName || item.authorEmail || labels.adminUser}</span>
          </article>
        )) : <p className="muted-line">{labels.noInternalNotes}</p>}
      </div>
    </div>
  );
}
