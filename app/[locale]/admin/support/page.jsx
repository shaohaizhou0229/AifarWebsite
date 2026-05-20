import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminSupportClient } from "@/components/AdminTicketsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/support/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminSupport");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function getFilterValue(query, key, allowedValues) {
  const value = typeof query?.[key] === "string" ? query[key] : "";
  return allowedValues.has(value) ? value : "";
}

export default async function AdminSupportPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminSupport"),
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
  const filters = {
    status: getFilterValue(query, "status", TICKET_STATUSES),
    priority: getFilterValue(query, "priority", TICKET_PRIORITIES),
    category: getFilterValue(query, "category", TICKET_CATEGORIES),
    assignee: typeof query?.assignee === "string" ? query.assignee : "",
    q: typeof query?.q === "string" ? query.q.trim() : ""
  };

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
    />
      <AdminSupportClient locale={locale} page={page} messages={messages} initialFilters={filters} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </>
  );
}
