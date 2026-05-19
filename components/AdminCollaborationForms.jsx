"use client";

import { useState } from "react";

function useSubmitStatus() {
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  return { status, setStatus, isSubmitting, setIsSubmitting };
}

function Message({ status }) {
  return status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null;
}

export function CollaborationSpaceForm({ labels }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const { status, setStatus, isSubmitting, setIsSubmitting } = useSubmitStatus();

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch("/api/admin/collaboration/spaces/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      window.location.href = result.space?.id ? `spaces/${result.space.id}/` : window.location.href;
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={submit}>
      <div className="field">
        <label htmlFor="spaceName">{labels.name}</label>
        <input id="spaceName" name="name" value={form.name} onChange={update} required />
      </div>
      <div className="field">
        <label htmlFor="spaceDescription">{labels.description}</label>
        <textarea id="spaceDescription" name="description" value={form.description} onChange={update} rows={3} />
      </div>
      <Message status={status} />
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.create}
      </button>
    </form>
  );
}

export function CollaborationMemberForm({ spaceId, members, adminOptions, labels, locale }) {
  const currentMemberIds = new Set(members.map((member) => member.userId));
  const options = adminOptions.filter((admin) => !currentMemberIds.has(admin.id));
  const [userId, setUserId] = useState(options[0]?.id || "");
  const { status, setStatus, isSubmitting, setIsSubmitting } = useSubmitStatus();

  async function submit(event) {
    event.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch(`/api/admin/collaboration/spaces/${spaceId}/members/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, locale })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      window.location.reload();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell compact-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="memberUser">{labels.member}</label>
        <select id="memberUser" value={userId} onChange={(event) => setUserId(event.target.value)}>
          {options.map((admin) => (
            <option key={admin.id} value={admin.id}>{admin.displayName || admin.email}</option>
          ))}
        </select>
      </div>
      <Message status={status} />
      <button className="button secondary" type="submit" disabled={isSubmitting || !userId}>
        {isSubmitting ? labels.saving : labels.add}
      </button>
    </form>
  );
}

export function CollaborationTaskForm({ spaceId, labels, locale }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueAt: "",
    taskType: "one_time",
    repeatFrequency: "weekly",
    repeatLimit: ""
  });
  const { status, setStatus, isSubmitting, setIsSubmitting } = useSubmitStatus();

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch(`/api/admin/collaboration/spaces/${spaceId}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      window.location.href = result.task?.id ? `/${locale}/admin/collaboration/tasks/${result.task.id}/` : window.location.href;
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={submit}>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="taskTitle">{labels.title}</label>
          <input id="taskTitle" name="title" value={form.title} onChange={update} required />
        </div>
        <div className="field">
          <label htmlFor="taskDueAt">{labels.dueAt}</label>
          <input id="taskDueAt" name="dueAt" type="datetime-local" value={form.dueAt} onChange={update} />
        </div>
        <div className="field">
          <label htmlFor="taskType">{labels.taskType}</label>
          <select id="taskType" name="taskType" value={form.taskType} onChange={update}>
            <option value="one_time">{labels.types.one_time}</option>
            <option value="recurring">{labels.types.recurring}</option>
          </select>
        </div>
        {form.taskType === "recurring" ? (
          <>
            <div className="field">
              <label htmlFor="repeatFrequency">{labels.repeatFrequency}</label>
              <select id="repeatFrequency" name="repeatFrequency" value={form.repeatFrequency} onChange={update}>
                <option value="daily">{labels.frequencies.daily}</option>
                <option value="weekly">{labels.frequencies.weekly}</option>
                <option value="monthly">{labels.frequencies.monthly}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="repeatLimit">{labels.repeatLimit}</label>
              <input id="repeatLimit" name="repeatLimit" type="number" min="1" value={form.repeatLimit} onChange={update} />
            </div>
          </>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="taskDescription">{labels.description}</label>
        <textarea id="taskDescription" name="description" value={form.description} onChange={update} rows={3} />
      </div>
      <Message status={status} />
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.create}
      </button>
    </form>
  );
}

export function CollaborationSubtaskForm({ taskId, members, labels, locale }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeUserId: members[0]?.userId || "",
    dueAt: ""
  });
  const { status, setStatus, isSubmitting, setIsSubmitting } = useSubmitStatus();

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch(`/api/admin/collaboration/tasks/${taskId}/subtasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      window.location.href = result.subtask?.id ? `/${locale}/admin/collaboration/subtasks/${result.subtask.id}/` : window.location.href;
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell compact-form" onSubmit={submit}>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor={`subtaskTitle-${taskId}`}>{labels.title}</label>
          <input id={`subtaskTitle-${taskId}`} name="title" value={form.title} onChange={update} required />
        </div>
        <div className="field">
          <label htmlFor={`subtaskAssignee-${taskId}`}>{labels.assignee}</label>
          <select id={`subtaskAssignee-${taskId}`} name="assigneeUserId" value={form.assigneeUserId} onChange={update}>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.displayName || member.email}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`subtaskDueAt-${taskId}`}>{labels.dueAt}</label>
          <input id={`subtaskDueAt-${taskId}`} name="dueAt" type="datetime-local" value={form.dueAt} onChange={update} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`subtaskDescription-${taskId}`}>{labels.description}</label>
        <textarea id={`subtaskDescription-${taskId}`} name="description" value={form.description} onChange={update} rows={2} />
      </div>
      <Message status={status} />
      <button className="button secondary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.create}
      </button>
    </form>
  );
}

export function SubtaskFeedbackForm({ subtask, labels, locale }) {
  const [form, setForm] = useState({
    status: subtask.status,
    message: ""
  });
  const { status, setStatus, isSubmitting, setIsSubmitting } = useSubmitStatus();

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });
    try {
      const response = await fetch(`/api/admin/collaboration/subtasks/${subtask.id}/updates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      setStatus({ type: "success", message: labels.saved });
      setForm((current) => ({ ...current, message: "" }));
      window.location.reload();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell compact-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor={`subtaskFeedbackStatus-${subtask.id}`}>{labels.status}</label>
        <select id={`subtaskFeedbackStatus-${subtask.id}`} name="status" value={form.status} onChange={update}>
          <option value="not_started">{labels.statuses.not_started}</option>
          <option value="in_progress">{labels.statuses.in_progress}</option>
          <option value="blocked">{labels.statuses.blocked}</option>
          <option value="completed">{labels.statuses.completed}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`subtaskFeedbackMessage-${subtask.id}`}>{labels.message}</label>
        <textarea
          id={`subtaskFeedbackMessage-${subtask.id}`}
          name="message"
          value={form.message}
          onChange={update}
          rows={4}
          required
        />
      </div>
      <Message status={status} />
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.submit}
      </button>
    </form>
  );
}

export function SubtaskStatusForm({ subtask, labels, locale }) {
  const [statusValue, setStatusValue] = useState(subtask.status);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/collaboration/subtasks/${subtask.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue, locale })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      setMessage(labels.saved);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="inline-status-form" onSubmit={submit}>
      <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
        <option value="not_started">{labels.statuses.not_started}</option>
        <option value="in_progress">{labels.statuses.in_progress}</option>
        <option value="blocked">{labels.statuses.blocked}</option>
        <option value="completed">{labels.statuses.completed}</option>
      </select>
      <button className="button secondary compact" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.save}
      </button>
      {message ? <span className="muted-line">{message}</span> : null}
    </form>
  );
}

export function CloseRecurringTaskButton({ task, labels }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function closeTask() {
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/collaboration/tasks/${task.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          dueAt: task.dueAt || "",
          isRecurringClosed: true
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.failed);
      setMessage(labels.closed);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (task.taskType !== "recurring" || task.isRecurringClosed) {
    return null;
  }

  return (
    <div className="status-actions">
      <button className="button secondary compact" type="button" disabled={isSubmitting} onClick={closeTask}>
        {isSubmitting ? labels.saving : labels.closeRecurring}
      </button>
      {message ? <span className="muted-line">{message}</span> : null}
    </div>
  );
}
