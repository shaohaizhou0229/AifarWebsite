import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminContactTicketsClient } from "@/components/AdminTicketsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { TICKET_STATUSES } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminTickets");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminTicketsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminTickets"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);
  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.support);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const query = await searchParams;
  const status = typeof query?.status === "string" && TICKET_STATUSES.has(query.status) ? query.status : "";

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={adminHome.shell}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.support }
      ]}
      actions={(
        <div className="admin-segmented">
          <Link href={localizedPath(locale, "/admin/tickets/")} prefetch={false}>{page.all}</Link>
          <Link href={`${localizedPath(locale, "/admin/tickets/")}?status=new`} prefetch={false}>{page.new}</Link>
          <Link href={`${localizedPath(locale, "/admin/tickets/")}?status=in_progress`} prefetch={false}>{page.inProgress}</Link>
          <Link href={`${localizedPath(locale, "/admin/tickets/")}?status=closed`} prefetch={false}>{page.closed}</Link>
        </div>
      )}
    />
      <AdminContactTicketsClient locale={locale} page={page} messages={messages} initialStatus={status} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </>
  );
}
