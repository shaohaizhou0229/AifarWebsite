import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import {
  CollaborationSubtaskForm,
  CloseRecurringTaskButton
} from "@/components/AdminCollaborationForms";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getCollaborationTask } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/collaboration/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminCollaborationTask");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminCollaborationTaskPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, listPage, adminHome] = await Promise.all([
    getPageMessages(locale, "adminCollaborationTask"),
    getPageMessages(locale, "adminCollaboration"),
    getPageMessages(locale, "adminHome")
  ]);

  let user;
  try {
    const context = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    user = context.user;
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  let details;
  try {
    details = await getCollaborationTask(id, user.id);
  } catch (error) {
    notFound();
  }
  if (!details?.task) notFound();
  const { task, space, canCreateSubtask } = details;

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="collaboration"
      eyebrow={page.eyebrow}
      title={task.title}
      lead={task.description || page.noDescription}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: listPage.breadcrumb, href: "/admin/collaboration/" },
        { label: space.name, href: `/admin/collaboration/spaces/${space.id}/` },
        { label: task.title }
      ]}
    >
      <div className="admin-detail-layout">
          <article className="admin-panel detail-card">
            <div className="task-heading">
              <div>
                <span className="admin-status admin-status-neutral">{page.taskTypes[task.taskType] || task.taskType}</span>
                <h2>{page.overviewTitle}</h2>
                <p className="muted-line">{page.createdBy}: {task.createdByName || task.createdByEmail || page.notProvided}</p>
                <p className="muted-line">{page.dueAt}: {formatDate(task.dueAt, locale) || page.notProvided}</p>
              </div>
              <div className="task-progress" aria-label={page.progress}>
                <strong>{task.progress}%</strong>
                <span>{task.completedSubtasks}/{task.totalSubtasks}</span>
              </div>
            </div>
            {task.taskType === "recurring" ? (
              <div className="status-actions">
                <p className="muted-line">
                  {page.repeat}: {page.frequencies[task.repeatFrequency] || task.repeatFrequency}
                  {task.repeatLimit ? ` - ${page.repeatLimit}: ${task.generatedCount}/${task.repeatLimit}` : ` - ${page.untilClosed}`}
                </p>
                <CloseRecurringTaskButton task={task} labels={page.recurringActions} />
              </div>
            ) : null}
          </article>
          <article className="admin-panel detail-card">
            <h2>{page.subtasksTitle}</h2>
            <div className="subtask-list">
              {task.subtasks.length ? task.subtasks.map((subtask) => (
                <a className="subtask-row" key={subtask.id} href={localizedPath(locale, `/admin/collaboration/subtasks/${subtask.id}/`)}>
                  <div>
                    <span className="admin-status admin-status-neutral">{page.statuses[subtask.status] || subtask.status}</span>
                    <h3>{subtask.title}</h3>
                    <p>{subtask.description || page.noDescription}</p>
                    <p className="muted-line">
                      {page.assignee}: {subtask.assigneeName || subtask.assigneeEmail || page.notProvided}
                      {" - "}
                      {page.dueAt}: {formatDate(subtask.dueAt, locale) || page.notProvided}
                    </p>
                  </div>
                </a>
              )) : <p className="muted-line">{page.noSubtasks}</p>}
            </div>
          </article>
          {canCreateSubtask ? (
            <article className="admin-panel detail-card">
              <h2>{page.createSubtaskTitle}</h2>
              <CollaborationSubtaskForm taskId={task.id} members={space.members} labels={page.subtaskForm} locale={locale} />
            </article>
          ) : null}
      </div>
    </AdminShell>
  );
}
