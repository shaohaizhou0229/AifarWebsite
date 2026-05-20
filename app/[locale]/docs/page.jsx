import { setRequestLocale } from "next-intl/server";
import { DocumentHub } from "@/components/DocumentHub";
import { PageHero } from "@/components/PageHero";
import { DOCUMENT_CATEGORY_KEYS, listDocumentCategories, listPublicDocuments } from "@/lib/documents";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/docs/";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "docs");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function DocsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "docs");
  let categories = DOCUMENT_CATEGORY_KEYS.map((key, index) => ({
    key,
    label: page.categories?.[key]?.label || key,
    description: page.categories?.[key]?.description || "",
    sortOrder: index,
    requiresLoginToView: false,
    allowAuthenticatedDownload: false
  }));
  let documents = [];

  try {
    [categories, documents] = await Promise.all([
      listDocumentCategories(),
      listPublicDocuments()
    ]);
  } catch {
    documents = [];
  }

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <DocumentHub locale={locale} page={page} initialCategories={categories} initialDocuments={documents} />
      </section>
    </main>
  );
}
