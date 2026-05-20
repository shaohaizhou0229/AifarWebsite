import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CollaborationSpaceForm } from "@/components/AdminCollaborationForms";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listCollaborationSpaces, listMyCollaborationSubtasks } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/collaboration/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminCollaboration");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminCollaborationPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
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

  const [spaces, subtasks] = await Promise.all([
    listCollaborationSpaces(user.id),
    listMyCollaborationSubtasks(user.id)
  ]);

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="collaboration"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
    >
      <article className="admin-panel detail-card">
        <h2>{page.createSpace.title}</h2>
        <p>{page.createSpace.lead}</p>
        <CollaborationSpaceForm labels={page.createSpace.form} />
      </article>
      <div className="dashboard-split">
        <section className="admin-panel">
          <h2>{page.spacesTitle}</h2>
          <div className="release-list">
            {spaces.length ? spaces.map((space) => (
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
            {subtasks.length ? subtasks.map((subtask) => (
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
    </AdminShell>
  );
}
