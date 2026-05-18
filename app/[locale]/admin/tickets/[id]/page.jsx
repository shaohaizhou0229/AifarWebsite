import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { AdminTicketActions } from "@/components/AdminTicketActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listAdminProfiles } from "@/lib/profiles";
import { getAdminTicket } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { getRequestTypeLabel, getTicketCategoryLabel, getTicketPriorityLabel, getTicketStatusLabel } from "@/i18n/labels";

const pathname = "/admin/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminTicketDetail");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminTicketDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([getPageMessages(locale, "adminTicketDetail"), getLocaleMessages(locale)]);
  const adminHome = await getPageMessages(locale, "adminHome");

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.support);
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

  const [result, profiles] = await Promise.all([
    getAdminTicket(id),
    listAdminProfiles()
  ]);
  if (!result) notFound();

  const { ticket, replies, internalNotes } = result;
  const adminLabels = messages.forms.admin;

  return (
    <main>
      <PageHero
        eyebrow={page.eyebrow}
        title={ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}
        lead={`${ticket.name} - ${ticket.workEmail} - ${page.submitted} ${formatDate(ticket.createdAt, locale)}`}
      />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: adminHome.nav.support, href: "/admin/support/" },
              { label: page.breadcrumb }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="support" />
          <div className="ticket-detail-grid">
            <div className="ticket-conversation">
              <article className="card detail-card">
                <h3>{page.requestTitle}</h3>
                <p>{ticket.message}</p>
                <p className="muted-line">{page.organization}: {ticket.organization || page.notProvided}</p>
              </article>
              <div className="reply-list">
                <h2>{page.replies}</h2>
                {replies.length ? replies.map((reply) => (
                  <article className="card" key={reply.id}>
                    <h3>{reply.authorName || reply.authorEmail || reply.authorRole}</h3>
                    <p>{reply.message}</p>
                    <p className="muted-line">{formatDate(reply.createdAt, locale)}</p>
                  </article>
                )) : <p className="muted-line">{page.noReplies}</p>}
              </div>
            </div>
            <AdminTicketActions ticket={ticket} labels={adminLabels} profiles={profiles} internalNotes={internalNotes} />
            <aside className="ticket-side-panel">
              <h2>{page.processing}</h2>
              <dl>
                <div>
                  <dt>{adminLabels.status}</dt>
                  <dd>{getTicketStatusLabel(adminLabels, ticket.status)}</dd>
                </div>
                <div>
                  <dt>{adminLabels.priority}</dt>
                  <dd>{getTicketPriorityLabel(adminLabels, ticket.priority)}</dd>
                </div>
                <div>
                  <dt>{adminLabels.category}</dt>
                  <dd>{getTicketCategoryLabel(adminLabels, ticket.category || "other")}</dd>
                </div>
                <div>
                  <dt>{adminLabels.assignee}</dt>
                  <dd>{ticket.assigneeName || ticket.assigneeEmail || adminLabels.unassigned}</dd>
                </div>
                <div>
                  <dt>{page.customer}</dt>
                  <dd>{ticket.name} / {ticket.workEmail}</dd>
                </div>
                <div>
                  <dt>{page.createdAt}</dt>
                  <dd>{formatDate(ticket.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{page.lastRepliedAt}</dt>
                  <dd>{formatDate(ticket.lastRepliedAt, locale) || page.notProvided}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
