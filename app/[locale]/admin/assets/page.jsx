import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAssetsClient } from "@/components/AdminAssetsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getImageGenerationSettings } from "@/lib/image-generation-settings";
import { listProjectAssets } from "@/lib/project-assets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/assets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminAssets");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminAssetsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminAssets"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.assets);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const [initialData, imageSettings] = await Promise.all([
    listProjectAssets({ limit: 24 }),
    Promise.resolve(getImageGenerationSettings())
  ]);

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
      <AdminAssetsClient
        locale={locale}
        page={page}
        assetLabels={messages.forms.assets}
        initialData={initialData}
        defaultGenerateSize={imageSettings.defaultSize}
        imageSettings={imageSettings}
        loadingLabel={messages.forms.common.pleaseWait}
        errorLabel={messages.forms.siteContent.loadFailed}
      />
    </>
  );
}
