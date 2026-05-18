"use client";

import { useState } from "react";

export function AdminInvitationActions({ invitationId, labels }) {
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);

  async function handleCancel() {
    if (!window.confirm(labels.confirm)) return;
    setIsCanceling(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch(`/api/admin/user-invitations/${invitationId}/`, {
        method: "DELETE"
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.failed);
      }

      setIsCanceled(true);
      setStatus({ type: "success", message: labels.canceled });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <div className="inline-actions">
      <button className="button secondary" type="button" disabled={isCanceling || isCanceled} onClick={handleCancel}>
        {isCanceling ? labels.canceling : isCanceled ? labels.canceled : labels.cancel}
      </button>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
    </div>
  );
}
