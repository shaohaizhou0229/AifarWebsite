import { setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminSiteContentForm } from "@/components/AdminSiteContentForm";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getImageGenerationSettings } from "@/lib/image-generation-settings";
import { SITE_LAYOUT_VERSION } from "@/lib/site-page-builder";
import { getAdminSitePageContent, listSiteContentSnapshots } from "@/lib/site-content";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localeLabels, locales, localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/product/designer/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  await connection();
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminProduct");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function createBlankDesign(content) {
  return {
    layoutVersion: SITE_LAYOUT_VERSION,
    seo: content?.seo || {},
    sections: []
  };
}

export default async function AdminProductDesignerPage({ params, searchParams }) {
  await connection();
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminProduct"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.product);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  let canManageAiSettings = false;
  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.settings);
    canManageAiSettings = true;
  } catch {
    canManageAiSettings = false;
  }

  const initialPageKey = query?.page === "product" ? "product" : "home";
  const initialLocale = locales.includes(query?.contentLocale) ? query.contentLocale : locale;
  const mode = query?.mode === "new" ? "new" : "edit";
  const fallback = await getPageMessages(initialLocale, initialPageKey);
  const [contentState, snapshots] = await Promise.all([
    getAdminSitePageContent(initialPageKey, initialLocale, fallback),
    listSiteContentSnapshots(initialPageKey, initialLocale)
  ]);
  const labels = messages.forms.siteContent;
  const initialContent = mode === "new" ? createBlankDesign(contentState.content) : contentState.content;

  return (
    <>
      <AdminPageHeader
        locale={locale}
        shell={adminHome.shell}
        breadcrumbs={[
          { label: adminHome.nav.home, href: "/admin/" },
          { label: page.breadcrumb || page.title, href: "/admin/product/" },
          { label: labels.designerBreadcrumb || labels.designerTitle || labels.inspector }
        ]}
      />
      <div className="admin-detail-layout admin-detail-layout-wide">
        <AdminSiteContentForm
          labels={labels}
          assetLabels={messages.forms.assets}
          adminLocale={locale}
          imageSettings={getImageGenerationSettings()}
          canManageAiSettings={canManageAiSettings}
          aiSettingsHref={localizedPath(locale, "/admin/settings/ai/")}
          initialPageKey={initialPageKey}
          initialLocale={initialLocale}
          initialContent={initialContent}
          initialEntry={contentState.entry}
          initialSnapshots={snapshots}
          pageOptions={[
            { key: "home", label: labels.homePage },
            { key: "product", label: labels.productPage }
          ]}
          localeOptions={locales.map((key) => ({ key, label: localeLabels[key] || key }))}
          mode={mode}
          backHref={`${localizedPath(locale, "/admin/product/")}?contentLocale=${encodeURIComponent(initialLocale)}`}
        />
      </div>
    </>
  );
}
