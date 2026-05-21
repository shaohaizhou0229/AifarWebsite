import { setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminSiteContentOverview } from "@/components/AdminSiteContentOverview";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminSitePageContent, listSiteContentSnapshotsForPages } from "@/lib/site-content";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localeLabels, locales, localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/product/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  await connection();
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminProduct");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminProductPage({ params, searchParams }) {
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

  const contentLocale = locales.includes(query?.contentLocale) ? query.contentLocale : locale;
  const labels = messages.forms.siteContent;
  const pageOptions = [
    { key: "home", label: labels.homePage, publicPath: "/" },
    { key: "product", label: labels.productPage, publicPath: "/product/" }
  ];
  const contentStates = await Promise.all(
    pageOptions.map(async (option) => {
      const fallback = await getPageMessages(contentLocale, option.key);
      const state = await getAdminSitePageContent(option.key, contentLocale, fallback);
      return {
        ...option,
        content: state.content,
        entry: state.entry
      };
    })
  );
  const history = await listSiteContentSnapshotsForPages(pageOptions.map((option) => option.key), contentLocale, 12);
  const pageLabelByKey = Object.fromEntries(pageOptions.map((option) => [option.key, option.label]));

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
        { label: page.breadcrumb || page.title }
      ]}
    />
      <div className="admin-detail-layout">
        <AdminSiteContentOverview
          labels={labels}
          locale={locale}
          contentLocale={contentLocale}
          pages={contentStates}
          history={history.map((item) => ({
            ...item,
            pageLabel: pageLabelByKey[item.pageKey] || item.pageKey
          }))}
          localeOptions={locales.map((key) => ({ key, label: localeLabels[key] || key }))}
        />
      </div>
    </>
  );
}
