import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listAdminTickets, TICKET_STATUSES } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { getRequestTypeLabel, getTicketStatusLabel } from "@/i18n/labels";

const pathname = "/admin/contact/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminContact");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AdminContactPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminContact"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.contact);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const query = await searchParams;
  const status = typeof query?.status === "string" && TICKET_STATUSES.has(query.status) ? query.status : "";
  const tickets = await listAdminTickets(status);

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="contact"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
      actions={(
        <div className="admin-segmented">
          <a href={localizedPath(locale, "/admin/contact/")}>{page.all}</a>
          <a href={`${localizedPath(locale, "/admin/contact/")}?status=new`}>{page.new}</a>
          <a href={`${localizedPath(locale, "/admin/contact/")}?status=in_progress`}>{page.inProgress}</a>
          <a href={`${localizedPath(locale, "/admin/contact/")}?status=closed`}>{page.closed}</a>
        </div>
      )}
    >
      <div className="admin-table-list">
        {tickets.length ? tickets.map((ticket) => (
          <a className="admin-table-row" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)}>
            <div>
              <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
              <p>{ticket.name} - {ticket.workEmail}</p>
            </div>
            <time>{formatDate(ticket.createdAt, locale)}</time>
            <span className="admin-status admin-status-neutral">{getTicketStatusLabel(messages.forms.admin, ticket.status)}</span>
          </a>
        )) : (
          <article className="admin-panel admin-empty-state">
            <h2>{page.emptyTitle}</h2>
            <p>{page.emptyLead}</p>
          </article>
        )}
      </div>
    </AdminShell>
  );
}
