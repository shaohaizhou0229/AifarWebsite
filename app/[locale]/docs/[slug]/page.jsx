import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentTableOfContents } from "@/components/DocumentTableOfContents";
import { MarkdownContent, getMarkdownTableOfContents } from "@/components/MarkdownContent";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getPublicDocumentBySlug, normalizeDocumentSlug } from "@/lib/documents";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/docs/";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const page = await getPageMessages(locale, "docDetail");
  const safeSlug = normalizeDocumentSlug(slug);
  const document = safeSlug ? await getPublicDocumentBySlug(safeSlug).catch(() => null) : null;
  return buildMetadata({
    locale,
    pathname,
    title: document?.title ? `${document.title} | Aifar` : page.seo.title,
    description: document?.summary || page.seo.description
  });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function DocDetailPage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [page, docsPage] = await Promise.all([
    getPageMessages(locale, "docDetail"),
    getPageMessages(locale, "docs")
  ]);
  const safeSlug = normalizeDocumentSlug(slug);
  if (!safeSlug) notFound();

  let document = await getPublicDocumentBySlug(safeSlug);
  let currentUser = null;
  if (!document) {
    currentUser = await getCurrentUser();
    const gatedDocument = await getPublicDocumentBySlug(safeSlug, { includeLoginGated: true });
    if (gatedDocument?.requiresLoginToView && !currentUser) {
      redirect(localizedPath(locale, "/login/"));
    }
    document = gatedDocument;
  }

  if (!document) {
    notFound();
  }

  const user = currentUser || (document.requiresLoginToView || document.allowAuthenticatedDownload ? await getCurrentUser() : null);
  const canDownload = Boolean(user && document.allowAuthenticatedDownload && document.storagePath);
  const tocItems = getMarkdownTableOfContents(document.markdownContent);

  return (
    <main>
      <PageHero eyebrow={docsPage.categories?.[document.categoryKey]?.label || document.categoryLabel} title={document.title} lead={document.summary || page.lead} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: docsPage.breadcrumb || docsPage.eyebrow, href: "/docs/" },
              { label: document.title }
            ]}
          />
          <article className="card detail-card document-meta">
            <div>
              <p className="eyebrow">{page.currentVersion}</p>
              <h3>{document.currentVersionLabel || page.noVersion}</h3>
              {document.versionCreatedAt ? <p className="muted-line">{page.updatedAt}: {formatDate(document.versionCreatedAt, locale)}</p> : null}
              {document.checksumSha256 ? <code className="checksum-line">SHA-256: {document.checksumSha256}</code> : null}
            </div>
            <div className="card-actions">
              {canDownload ? (
                <a className="button primary" href={`/api/docs/${document.slug}/download/`}>{page.download}</a>
              ) : (
                <span className="pill">{user ? page.downloadDisabled : page.signInToDownload}</span>
              )}
            </div>
          </article>
          <div className="doc-reading-layout">
            <div className="doc-reading-main">
              <DocumentTableOfContents items={tocItems} labels={page} variant="mobile" />
              <MarkdownContent content={document.markdownContent} />
            </div>
            <DocumentTableOfContents items={tocItems} labels={page} variant="desktop" />
          </div>
        </div>
      </section>
    </main>
  );
}
