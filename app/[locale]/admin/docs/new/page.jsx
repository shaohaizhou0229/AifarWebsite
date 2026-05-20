import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminDocumentForm } from "@/components/AdminDocumentForm";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { listDocumentCategories } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/docs/new/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDocEdit");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function localizeCategories(categories, adminDocs) {
  return categories.map((category) => ({
    ...category,
    label: adminDocs.categories?.[category.key]?.label || category.label
  }));
}

export default async function NewAdminDocumentPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminDocs, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminDocEdit"),
    getPageMessages(locale, "adminDocs"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.docs);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const categories = localizeCategories(await listDocumentCategories(), adminDocs);

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="docs"
      eyebrow={page.eyebrow}
      title={page.newTitle}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: adminHome.nav.docs, href: "/admin/docs/" },
        { label: page.newBreadcrumb }
      ]}
    >
      <div className="admin-detail-layout">
        <AdminDocumentForm categories={categories} labels={messages.forms.documents} locale={locale} />
      </div>
    </AdminShell>
  );
}
