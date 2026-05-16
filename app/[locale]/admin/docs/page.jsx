import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { listAdminDocuments } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/docs/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDocs");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function categoryLabel(page, categoryKey, fallback) {
  return page.categories?.[categoryKey]?.label || fallback || categoryKey;
}

export default async function AdminDocsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminDocs"),
    getPageMessages(locale, "adminHome")
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

  const documents = await listAdminDocuments();

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: page.breadcrumb }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="docs" />
          <div className="status-actions">
            <a className="button primary" href={localizedPath(locale, "/admin/docs/new/")}>{page.newDocument}</a>
          </div>
          <div className="release-list">
            {documents.map((document) => (
              <a className="release" key={document.id} href={localizedPath(locale, `/admin/docs/${document.id}/`)}>
                <div>
                  <h3>{document.title}</h3>
                  <p>{document.summary || page.noSummary}</p>
                  <p className="muted-line">
                    {categoryLabel(page, document.categoryKey, document.categoryLabel)} - {page.version}: {document.currentVersionLabel || page.noVersion}
                    {document.updatedAt ? ` - ${formatDate(document.updatedAt, locale)}` : ""}
                  </p>
                </div>
                <span className="pill">{document.isPublished ? page.published : page.draft}</span>
              </a>
            ))}
            {!documents.length ? (
              <article className="card admin-empty-state">
                <span className="pill">{page.emptyStatus}</span>
                <h2>{page.emptyTitle}</h2>
                <p>{page.emptyLead}</p>
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
