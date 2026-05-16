import { setRequestLocale } from "next-intl/server";
import { DocLink } from "@/components/Rows";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentCategories, listPublicDocuments } from "@/lib/documents";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/docs/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "docs");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function localCategory(page, category) {
  return {
    ...category,
    label: page.categories?.[category.key]?.label || category.label,
    description: page.categories?.[category.key]?.description || category.description
  };
}

export default async function DocsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "docs");
  const user = await getCurrentUser();
  const [categories, documents] = await Promise.all([
    listDocumentCategories(),
    listPublicDocuments({ includeLoginGated: Boolean(user) })
  ]);

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner document-hub">
          {categories.map((category) => {
            const localizedCategory = localCategory(page, category);
            const categoryDocs = documents.filter((document) => document.categoryKey === category.key);

            return (
              <section className="document-category" key={category.key}>
                <div className="section-head compact">
                  <div>
                    <p className="eyebrow">{localizedCategory.label}</p>
                    <h2>{localizedCategory.label}</h2>
                    <p>{localizedCategory.description}</p>
                  </div>
                  <span className="pill">{category.requiresLoginToView ? page.loginRequired : page.publicReadable}</span>
                </div>
                <div className="doc-list">
                  {categoryDocs.map((document) => (
                    <DocLink
                      key={document.id}
                      title={document.title}
                      description={document.summary || page.noSummary}
                      pill={document.currentVersionLabel || page.noVersion}
                      href={localizedPath(locale, `/docs/${document.slug}/`)}
                    />
                  ))}
                  {!categoryDocs.length ? <p className="muted-line">{page.emptyCategory}</p> : null}
                </div>
              </section>
            );
          })}
          {!documents.length ? (
            <div className="doc-list">
              {page.items.map(([title, description, pill]) => (
                <DocLink key={title} title={title} description={description} pill={pill} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
