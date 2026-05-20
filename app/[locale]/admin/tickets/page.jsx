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

const pathname = "/admin/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminTickets");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AdminTicketsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminTickets"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);
  const adminNav = adminHome.nav;

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.support);
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
      current="support"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminNav.home, href: "/admin/" },
        { label: adminNav.contact, href: "/admin/contact/" },
        { label: page.breadcrumb }
      ]}
      actions={(
        <div className="admin-segmented">
          <a href={localizedPath(locale, "/admin/tickets/")}>{page.all}</a>
          <a href={`${localizedPath(locale, "/admin/tickets/")}?status=new`}>{page.new}</a>
          <a href={`${localizedPath(locale, "/admin/tickets/")}?status=in_progress`}>{page.inProgress}</a>
          <a href={`${localizedPath(locale, "/admin/tickets/")}?status=closed`}>{page.closed}</a>
        </div>
      )}
    >
      <div className="admin-table-list">
        {tickets.map((ticket) => (
          <a className="admin-table-row" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)}>
            <div>
              <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
              <p>{ticket.name} - {ticket.workEmail}</p>
            </div>
            <time>{formatDate(ticket.createdAt, locale)}</time>
            <span className="admin-status admin-status-neutral">{getTicketStatusLabel(messages.forms.admin, ticket.status)}</span>
          </a>
        ))}
      </div>
    </AdminShell>
  );
}
