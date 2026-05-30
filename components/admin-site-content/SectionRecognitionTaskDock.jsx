"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Eye, Loader2, Plus, RefreshCw, RotateCcw, Save, Sparkles, XCircle } from "lucide-react";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";

const { createTemplateMetadataDraft } = sectionTemplateUi;
const ACTIVE_STATUSES = new Set(["queued", "running"]);

function taskStatusLabel(labels, status) {
  return labels.aiTaskStatuses?.[status] || status;
}

function formatTaskTime(task) {
  const started = task?.startedAt ? new Date(task.startedAt).getTime() : 0;
  const ended = task?.completedAt ? new Date(task.completedAt).getTime() : 0;
  if (!started || !ended || ended <= started) return "";
  const seconds = Math.max(1, Math.round((ended - started) / 1000));
  return `${seconds}s`;
}

function TaskIcon({ status }) {
  if (status === "succeeded") return <CheckCircle2 size={16} aria-hidden="true" />;
  if (status === "failed") return <XCircle size={16} aria-hidden="true" />;
  if (status === "cancelled") return <AlertTriangle size={16} aria-hidden="true" />;
  return <Loader2 className="spin" size={16} aria-hidden="true" />;
}

export function SectionRecognitionTaskDock({
  labels,
  tasks = [],
  busyTaskId = "",
  onRefresh,
  onCancel,
  onRetry,
  onPreview,
  onInsert,
  onSaveTemplate
}) {
  const [open, setOpen] = useState(false);
  const activeCount = tasks.filter((task) => ACTIVE_STATUSES.has(task.status)).length;
  const latestTask = tasks[0] || null;
  const hasTasks = tasks.length > 0;
  const dockTitle = activeCount
    ? labels.aiTasksRunning
    : latestTask?.status === "succeeded"
      ? labels.aiTasksDone
      : latestTask?.status === "failed"
        ? labels.aiTasksFailed
        : labels.aiTasksTitle;
  const visibleTasks = useMemo(() => tasks.slice(0, 8), [tasks]);

  if (!hasTasks) return null;

  async function saveTemplate(task) {
    if (!task?.candidate) return;
    await onSaveTemplate(task.candidate, createTemplateMetadataDraft(task.candidate));
  }

  return (
    <aside className={`section-recognition-task-dock ${open ? "open" : ""}`} aria-label={labels.aiTasksTitle}>
      <button className="section-recognition-task-summary" type="button" onClick={() => setOpen((current) => !current)}>
        <Sparkles size={16} aria-hidden="true" />
        <span>{dockTitle}</span>
        {activeCount ? <strong>{activeCount}</strong> : null}
        {open ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronUp size={15} aria-hidden="true" />}
      </button>

      {open ? (
        <section className="section-recognition-task-panel">
          <header>
            <div>
              <p className="eyebrow">{labels.aiRecognizeBlock}</p>
              <strong>{labels.aiTasksTitle}</strong>
            </div>
            <button className="icon-button" type="button" onClick={onRefresh} title={labels.refresh || labels.templateRetry} aria-label={labels.refresh || labels.templateRetry}>
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </header>

          <div className="section-recognition-task-list">
            {visibleTasks.map((task) => {
              const active = ACTIVE_STATUSES.has(task.status);
              const canUseResult = task.status === "succeeded" && task.candidate;
              const busy = busyTaskId === task.id;
              return (
                <article className={`section-recognition-task-row ${task.status}`} key={task.id}>
                  <div className="section-recognition-task-main">
                    <TaskIcon status={task.status} />
                    <div>
                      <strong>{task.screenshot?.filename || labels.aiScreenshot}</strong>
                      <span>{taskStatusLabel(labels, task.status)}{formatTaskTime(task) ? ` · ${formatTaskTime(task)}` : ""}</span>
                      {task.errorMessage ? <small>{task.errorMessage}</small> : null}
                    </div>
                  </div>
                  <div className="section-recognition-task-progress" aria-hidden="true">
                    <span style={{ width: `${Math.max(5, Math.min(100, Number(task.progress || 0)))}%` }} />
                  </div>
                  <div className="section-recognition-task-actions">
                    {canUseResult ? (
                      <>
                        <button type="button" onClick={() => onPreview(task.candidate)} title={labels.previewTemplate || labels.templatePreview} aria-label={labels.previewTemplate || labels.templatePreview}>
                          <Eye size={14} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => onInsert(task.candidate)} title={labels.insertBlock} aria-label={labels.insertBlock}>
                          <Plus size={14} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => saveTemplate(task)} disabled={busy} title={labels.saveAiSectionTemplate} aria-label={labels.saveAiSectionTemplate}>
                          <Save size={14} aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                    {task.status === "failed" ? (
                      <button type="button" onClick={() => onRetry(task)} disabled={busy} title={labels.templateRetry} aria-label={labels.templateRetry}>
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                    {active ? (
                      <button className="danger" type="button" onClick={() => onCancel(task)} disabled={busy} title={labels.closePreview} aria-label={labels.closePreview}>
                        <XCircle size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
