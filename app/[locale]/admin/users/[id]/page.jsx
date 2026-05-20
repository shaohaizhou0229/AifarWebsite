import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminUserForm } from "@/components/AdminUserForm";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminUser } from "@/lib/profiles";
import { listAdminTicketsForUser } from "@/lib/tickets";
import { listUserFootprints } from "@/lib/user-footprints";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { getRequestTypeLabel, getTicketStatusLabel } from "@/i18n/labels";

const pathname = "/admin/users/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminUserDetail");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function footprintLabel(labels, eventType) {
  const [group, key] = String(eventType || "").split(".");
  return labels.footprints?.[group]?.[key] || eventType;
}

export default async function AdminUserDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminUserDetail"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.users);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const user = await getAdminUser(id);
  if (!user) notFound();

  const [tickets, footprints] = await Promise.all([
    listAdminTicketsForUser(user),
    listUserFootprints(user.id)
  ]);

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={adminHome.shell}
      eyebrow={page.eyebrow}
      title={user.displayName || user.email}
      lead={`${page.role}: ${page.form.roles[user.role] || user.role} - ${page.form.accountStatus}: ${page.form.statuses[user.accountStatus] || user.accountStatus} - ${page.createdAt} ${formatDate(user.createdAt, locale)}`}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: adminHome.nav.users, href: "/admin/users/" },
        { label: page.breadcrumb }
      ]}
    />
      <div className="admin-detail-layout">
        <article className="admin-panel detail-card">
          <h2>{page.profileTitle}</h2>
          <AdminUserForm user={user} labels={page.form} />
        </article>
        <div className="reply-list admin-panel">
          <h2>{page.ticketsTitle}</h2>
          {tickets.length ? tickets.map((ticket) => (
            <Link className="release" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)} prefetch={false}>
              <div>
                <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
                <p>{formatDate(ticket.createdAt, locale)} - {ticket.workEmail}</p>
              </div>
              <span className="admin-status admin-status-neutral">{getTicketStatusLabel(messages.forms.admin, ticket.status)}</span>
            </Link>
          )) : <p className="muted-line">{page.noTickets}</p>}
        </div>
        <div className="reply-list">
          <h2>{page.footprintsTitle}</h2>
          {footprints.length ? footprints.map((footprint) => (
            <article className="admin-panel detail-card" key={footprint.id}>
              <span className="admin-status admin-status-neutral">{footprintLabel(page, footprint.eventType)}</span>
              <h3>{footprint.summary}</h3>
              <p className="muted-line">{formatDate(footprint.createdAt, locale)}</p>
              {footprint.actorEmail ? <p className="muted-line">{page.actor}: {footprint.actorName || footprint.actorEmail}</p> : null}
            </article>
          )) : <p className="muted-line">{page.noFootprints}</p>}
        </div>
      </div>
    </>
  );
}
