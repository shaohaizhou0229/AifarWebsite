import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminDownloadsClient } from "@/components/AdminDownloadsClient";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/downloads/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDownloads");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminDownloadsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminDownloads"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);
  const adminNav = adminHome.nav;

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="downloads"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminNav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
    >
      <AdminDownloadsClient locale={locale} page={page} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </AdminShell>
  );
}
