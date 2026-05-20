"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { localizedPath } from "@/i18n/routing";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function AdminCollaborationClient({ locale, page, loadingLabel, errorLabel }) {
  const [state, setState] = useState({ status: "loading", spaces: [], subtasks: [], error: "" });

  useEffect(() => {
    let active = true;

    async function loadCollaboration() {
      setState((current) => ({ ...current, status: "loading", error: "" }));
      try {
        const response = await fetch("/api/admin/collaboration/spaces/", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || errorLabel);
        if (active) {
          setState({
            status: "ready",
            spaces: Array.isArray(payload.spaces) ? payload.spaces : [],
            subtasks: Array.isArray(payload.subtasks) ? payload.subtasks : [],
            error: ""
          });
        }
      } catch (error) {
        if (active) setState({ status: "error", spaces: [], subtasks: [], error: error.message || errorLabel });
      }
    }

    loadCollaboration();
    return () => {
      active = false;
    };
  }, [errorLabel]);

  if (state.status !== "ready") {
    return <AdminAsyncState loading={state.status === "loading"} error={state.error} loadingLabel={loadingLabel} errorLabel={errorLabel} />;
  }

  return (
    <div className="dashboard-split">
      <section className="admin-panel">
        <h2>{page.spacesTitle}</h2>
        <div className="release-list">
          {state.spaces.length ? state.spaces.map((space) => (
            <Link className="release" key={space.id} href={localizedPath(locale, `/admin/collaboration/spaces/${space.id}/`)}>
              <div>
                <span className="admin-status admin-status-good">{page.statuses[space.status] || space.status}</span>
                <h3>{space.name}</h3>
                <p>{space.description || page.noDescription}</p>
                <p className="muted-line">{page.leader}: {space.leaderName || space.leaderEmail}</p>
              </div>
              <div className="admin-user-meta">
                <span>{page.tasks}: {space.taskCount}</span>
                <span>{page.openSubtasks}: {space.openSubtaskCount}</span>
              </div>
            </Link>
          )) : (
            <article className="admin-empty-state">
              <h2>{page.emptySpacesTitle}</h2>
              <p>{page.emptySpacesLead}</p>
            </article>
          )}
        </div>
      </section>
      <section className="admin-panel">
        <h2>{page.mySubtasksTitle}</h2>
        <div className="release-list">
          {state.subtasks.length ? state.subtasks.map((subtask) => (
            <Link className="release" key={subtask.id} href={localizedPath(locale, `/admin/collaboration/subtasks/${subtask.id}/`)}>
              <div>
                <span className="admin-status admin-status-neutral">{page.subtaskStatuses[subtask.status] || subtask.status}</span>
                <h3>{subtask.title}</h3>
                <p>{subtask.spaceName} - {subtask.taskTitle}</p>
                <p className="muted-line">{page.dueAt}: {formatDate(subtask.dueAt, locale) || page.notProvided}</p>
              </div>
            </Link>
          )) : (
            <article className="admin-empty-state">
              <h2>{page.emptySubtasksTitle}</h2>
              <p>{page.emptySubtasksLead}</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
