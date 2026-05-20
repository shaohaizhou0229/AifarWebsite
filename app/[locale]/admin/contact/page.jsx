import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminContactTicketsClient } from "@/components/AdminTicketsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { TICKET_STATUSES, listAdminTickets } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/contact/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminContact");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
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
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.contact);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const query = await searchParams;
  const status = typeof query?.status === "string" && TICKET_STATUSES.has(query.status) ? query.status : "";
  const initialTickets = await listAdminTickets({ status, limit: 20 });

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={adminHome.shell}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
      actions={(
        <div className="admin-segmented">
          <Link href={localizedPath(locale, "/admin/contact/")} prefetch={false}>{page.all}</Link>
          <Link href={`${localizedPath(locale, "/admin/contact/")}?status=new`} prefetch={false}>{page.new}</Link>
          <Link href={`${localizedPath(locale, "/admin/contact/")}?status=in_progress`} prefetch={false}>{page.inProgress}</Link>
          <Link href={`${localizedPath(locale, "/admin/contact/")}?status=closed`} prefetch={false}>{page.closed}</Link>
        </div>
      )}
    />
      <AdminContactTicketsClient key={status || "all"} locale={locale} page={page} messages={messages} initialStatus={status} initialTickets={initialTickets} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </>
  );
}
