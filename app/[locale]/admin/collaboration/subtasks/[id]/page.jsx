import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { SubtaskFeedbackForm } from "@/components/AdminCollaborationForms";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getCollaborationSubtask } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/collaboration/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminCollaborationSubtask");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminCollaborationSubtaskPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, listPage, adminHome] = await Promise.all([
    getPageMessages(locale, "adminCollaborationSubtask"),
    getPageMessages(locale, "adminCollaboration"),
    getPageMessages(locale, "adminHome")
  ]);

  let user;
  try {
    const context = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    user = context.user;
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return (
        <main>
          <PageHero eyebrow={page.eyebrow} title={page.deniedTitle} lead={page.deniedLead} />
        </main>
      );
    }
    redirect(localizedPath(locale, "/login/"));
  }

  let details;
  try {
    details = await getCollaborationSubtask(id, user.id);
  } catch (error) {
    notFound();
  }
  if (!details?.subtask) notFound();
  const { subtask, task, space, updates, permissions } = details;

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={subtask.title} lead={subtask.description || page.noDescription} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: listPage.breadcrumb, href: "/admin/collaboration/" },
              { label: space.name, href: `/admin/collaboration/spaces/${space.id}/` },
              { label: task.title, href: `/admin/collaboration/tasks/${task.id}/` },
              { label: subtask.title }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="collaboration" />
          <article className="card detail-card">
            <div className="task-heading">
              <div>
                <span className="pill">{page.statuses[subtask.status] || subtask.status}</span>
                <h2>{page.overviewTitle}</h2>
                <p className="muted-line">{page.task}: {task.title}</p>
                <p className="muted-line">{page.assignee}: {subtask.assigneeName || subtask.assigneeEmail || page.notProvided}</p>
                <p className="muted-line">{page.dueAt}: {formatDate(subtask.dueAt, locale) || page.notProvided}</p>
              </div>
            </div>
          </article>
          {permissions.canUpdate ? (
            <article className="card detail-card">
              <h2>{page.feedbackTitle}</h2>
              <p>{page.feedbackLead}</p>
              <SubtaskFeedbackForm subtask={subtask} labels={page.feedbackForm} locale={locale} />
            </article>
          ) : (
            <article className="card detail-card">
              <h2>{page.readOnlyTitle}</h2>
              <p>{page.readOnlyLead}</p>
            </article>
          )}
          <article className="card detail-card">
            <h2>{page.timelineTitle}</h2>
            <div className="timeline-list">
              {updates.length ? updates.map((update) => (
                <div className="timeline-item" key={update.id}>
                  <div>
                    <strong>{update.authorName || update.authorEmail || page.unknownActor}</strong>
                    <span className="muted-line">{formatDate(update.createdAt, locale)}</span>
                  </div>
                  <p>{update.message}</p>
                  {update.status ? (
                    <p className="muted-line">
                      {page.statusChange}: {page.statuses[update.previousStatus] || update.previousStatus || page.notProvided}
                      {" -> "}
                      {page.statuses[update.status] || update.status}
                    </p>
                  ) : null}
                </div>
              )) : (
                <p className="muted-line">{page.emptyTimeline}</p>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
