import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAiSettingsClient } from "@/components/AdminAiSettingsClient";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { buildAiSettingsEditDraft, getAiServiceSettingsAsync } from "@/lib/image-generation-settings";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/settings/ai/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminAiSettings");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminAiSettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminAiSettings"),
    getPageMessages(locale, "adminHome")
  ]);

  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.settings);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const settings = await getAiServiceSettingsAsync();

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
          { label: adminHome.nav.groups.system },
          { label: page.breadcrumb }
        ]}
      />
      <AdminAiSettingsClient labels={page} settings={settings} draft={buildAiSettingsEditDraft(settings)} />
    </>
  );
}
