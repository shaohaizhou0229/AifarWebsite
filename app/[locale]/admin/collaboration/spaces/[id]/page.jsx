import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import {
  CollaborationMemberForm,
  CollaborationTaskForm
} from "@/components/AdminCollaborationForms";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getCollaborationSpace } from "@/lib/collaboration";
import { getProfile, listAdminProfiles } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/collaboration/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminCollaborationSpace");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function PermissionCell({ value, label }) {
  return <span className={`permission-cell ${value ? "enabled" : ""}`}>{value ? label.yes : label.no}</span>;
}

export default async function AdminCollaborationSpacePage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, listPage, adminHome] = await Promise.all([
    getPageMessages(locale, "adminCollaborationSpace"),
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

  const [space, admins] = await Promise.all([
    getCollaborationSpace(id, user.id),
    listAdminProfiles()
  ]);
  if (!space) notFound();
  const isLeader = space.leaderUserId === user.id;

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="collaboration"
      eyebrow={page.eyebrow}
      title={space.name}
      lead={space.description || page.noDescription}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: listPage.breadcrumb, href: "/admin/collaboration/" },
        { label: space.name }
      ]}
    >
      <div className="admin-detail-layout">
          <article className="admin-panel detail-card">
            <h2>{page.membersTitle}</h2>
            <div className="permission-matrix">
              <div className="permission-row header">
                <span>{page.member}</span>
                <span>{page.permissions.cms}</span>
                <span>{page.permissions.downloads}</span>
                <span>{page.permissions.docs}</span>
                <span>{page.permissions.support}</span>
                <span>{page.permissions.contact}</span>
                <span>{page.permissions.collaboration}</span>
              </div>
              {space.members.map((member) => (
                <div className="permission-row" key={member.userId}>
                  <strong>{member.displayName || member.email}</strong>
                  <PermissionCell value={member.permissionSummary.cms} label={page.boolean} />
                  <PermissionCell value={member.permissionSummary.downloads} label={page.boolean} />
                  <PermissionCell value={member.permissionSummary.docs} label={page.boolean} />
                  <PermissionCell value={member.permissionSummary.support} label={page.boolean} />
                  <PermissionCell value={member.permissionSummary.contact} label={page.boolean} />
                  <PermissionCell value={member.permissionSummary.collaboration} label={page.boolean} />
                </div>
              ))}
            </div>
            {isLeader ? (
              <CollaborationMemberForm
                spaceId={space.id}
                members={space.members}
                adminOptions={admins}
                labels={page.memberForm}
                locale={locale}
              />
            ) : null}
          </article>
          <article className="admin-panel detail-card">
            <h2>{page.createTaskTitle}</h2>
            <CollaborationTaskForm spaceId={space.id} labels={page.taskForm} locale={locale} />
          </article>
          <div className="release-list">
            {space.tasks.length ? space.tasks.map((task) => (
              <article className="admin-panel detail-card collaboration-task" key={task.id}>
                <div className="task-heading">
                  <div>
                    <span className="admin-status admin-status-neutral">{page.taskTypes[task.taskType] || task.taskType}</span>
                    <h2>{task.title}</h2>
                    <p>{task.description || page.noDescription}</p>
                    <p className="muted-line">{page.dueAt}: {formatDate(task.dueAt, locale) || page.notProvided}</p>
                  </div>
                  <div className="task-progress" aria-label={page.progress}>
                    <strong>{task.progress}%</strong>
                    <span>{task.completedSubtasks}/{task.totalSubtasks}</span>
                  </div>
                </div>
                {task.taskType === "recurring" ? (
                  <p className="muted-line">
                    {page.repeat}: {page.frequencies[task.repeatFrequency] || task.repeatFrequency}
                    {task.repeatLimit ? ` - ${page.repeatLimit}: ${task.generatedCount}/${task.repeatLimit}` : ` - ${page.untilClosed}`}
                  </p>
                ) : null}
                <div className="subtask-list">
                  {task.subtasks.map((subtask) => (
                    <a
                      className="subtask-row"
                      key={subtask.id}
                      href={localizedPath(locale, `/admin/collaboration/subtasks/${subtask.id}/`)}
                    >
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
                  ))}
                  {!task.subtasks.length ? <p className="muted-line">{page.noSubtasks}</p> : null}
                </div>
                <a className="button secondary compact" href={localizedPath(locale, `/admin/collaboration/tasks/${task.id}/`)}>
                  {page.openTask}
                </a>
              </article>
            )) : (
              <article className="admin-panel admin-empty-state">
                <h2>{page.emptyTasksTitle}</h2>
                <p>{page.emptyTasksLead}</p>
              </article>
            )}
          </div>
      </div>
    </AdminShell>
  );
}
