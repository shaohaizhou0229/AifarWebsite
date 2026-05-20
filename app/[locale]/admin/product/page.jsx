import { setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminSiteContentForm } from "@/components/AdminSiteContentForm";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminSitePageContent } from "@/lib/site-content";
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
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const initialPageKey = query?.page === "product" ? "product" : "home";
  const initialLocale = locales.includes(query?.contentLocale) ? query.contentLocale : locale;
  const fallback = await getPageMessages(initialLocale, initialPageKey);
  const contentState = await getAdminSitePageContent(initialPageKey, initialLocale, fallback);
  const labels = messages.forms.siteContent;

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="product"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb || page.title }
      ]}
    >
      <div className="admin-detail-layout">
        <AdminSiteContentForm
          labels={labels}
          initialPageKey={initialPageKey}
          initialLocale={initialLocale}
          initialContent={contentState.content}
          initialEntry={contentState.entry}
          pageOptions={[
            { key: "home", label: labels.homePage },
            { key: "product", label: labels.productPage }
          ]}
          localeOptions={locales.map((key) => ({ key, label: localeLabels[key] || key }))}
        />
      </div>
    </AdminShell>
  );
}
