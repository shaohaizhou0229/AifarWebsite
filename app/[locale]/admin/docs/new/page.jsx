import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminDocumentForm } from "@/components/AdminDocumentForm";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { listDocumentCategories } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
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
    await requireAdmin(getProfile);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return (
        <main>
          <PageHero eyebrow={page.eyebrow} title={page.deniedTitle} lead={page.deniedLead} />
        </main>
      );
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const categories = localizeCategories(await listDocumentCategories(), adminDocs);

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.newTitle} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: adminHome.nav.docs, href: "/admin/docs/" },
              { label: page.newBreadcrumb }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="docs" />
          <AdminDocumentForm categories={categories} labels={messages.forms.documents} locale={locale} />
        </div>
      </section>
    </main>
  );
}
