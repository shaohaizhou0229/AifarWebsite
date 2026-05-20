import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminDownloadsClient } from "@/components/AdminDownloadsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
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
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.downloads);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const initialPlatforms = await listAdminDownloadPlatforms();

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={adminHome.shell}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminNav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
    />
      <AdminDownloadsClient locale={locale} page={page} initialPlatforms={initialPlatforms} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </>
  );
}
