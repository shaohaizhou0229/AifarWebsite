import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminDocumentForm } from "@/components/AdminDocumentForm";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getAdminDocument, listDocumentCategories, listDocumentVersions } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/docs/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDocEdit");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function localizeCategories(categories, adminDocs) {
  return categories.map((category) => ({
    ...category,
    label: adminDocs.categories?.[category.key]?.label || category.label
  }));
}

export default async function EditAdminDocumentPage({ params }) {
  const { locale, id } = await params;
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

  const [document, categories, versions] = await Promise.all([
    getAdminDocument(id),
    listDocumentCategories(),
    listDocumentVersions(id)
  ]);
  if (!document) notFound();

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={document.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: adminHome.nav.docs, href: "/admin/docs/" },
              { label: document.title }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="docs" />
          <article className="card detail-card">
            <h3>{page.current}</h3>
            <p>{document.currentVersionLabel || page.noVersion}</p>
            <p className="muted-line">{page.status}: {document.isPublished ? page.published : page.draft}</p>
            <p className="muted-line">{page.category}: {adminDocs.categories?.[document.categoryKey]?.label || document.categoryLabel}</p>
            {document.checksumSha256 ? <code className="checksum-line">SHA-256: {document.checksumSha256}</code> : null}
          </article>
          <AdminDocumentForm document={document} categories={localizeCategories(categories, adminDocs)} labels={messages.forms.documents} locale={locale} />
          <article className="card detail-card">
            <h3>{page.history}</h3>
            <div className="version-list">
              {versions.map((version) => (
                <div className="version-item" key={version.id}>
                  <strong>{version.versionLabel}</strong>
                  <span>{formatDate(version.createdAt, locale)}</span>
                  {version.originalFilename ? <span>{version.originalFilename}</span> : null}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
