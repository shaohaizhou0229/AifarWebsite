"use client";

import { useState } from "react";

export function AccountDeletionForm({ labels, redirectPath }) {
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canDelete = confirmation.trim() === labels.confirmText;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canDelete) {
      setStatus({ type: "error", message: labels.confirmRequired });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/profile/", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: labels.reason })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.failed);
      }

      setStatus({ type: "success", message: labels.deleted });
      window.location.assign(redirectPath);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell danger-zone" onSubmit={handleSubmit}>
      <h2>{labels.title}</h2>
      <p>{labels.lead}</p>
      <div className="field">
        <label htmlFor="deleteConfirmation">{labels.confirmLabel}</label>
        <input
          id="deleteConfirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={labels.confirmText}
        />
      </div>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button danger" type="submit" disabled={isSubmitting || !canDelete}>
        {isSubmitting ? labels.deleting : labels.delete}
      </button>
    </form>
  );
}
