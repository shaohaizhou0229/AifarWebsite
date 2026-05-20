import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { listAdminDocuments } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
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
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.docs);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const documents = await listAdminDocuments();

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="docs"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
      actions={<a className="button primary compact" href={localizedPath(locale, "/admin/docs/new/")}>{page.newDocument}</a>}
    >
      <div className="admin-table-list">
        {documents.map((document) => (
          <a className="admin-table-row" key={document.id} href={localizedPath(locale, `/admin/docs/${document.id}/`)}>
            <div>
              <h3>{document.title}</h3>
              <p>{document.summary || page.noSummary}</p>
            </div>
            <span>{categoryLabel(page, document.categoryKey, document.categoryLabel)}</span>
            <span>{document.currentVersionLabel || page.noVersion}</span>
            <span className="admin-status admin-status-neutral">{document.isPublished ? page.published : page.draft}</span>
            <time>{formatDate(document.updatedAt, locale)}</time>
          </a>
        ))}
        {!documents.length ? (
          <article className="admin-panel admin-empty-state">
            <span className="admin-status admin-status-neutral">{page.emptyStatus}</span>
            <h2>{page.emptyTitle}</h2>
            <p>{page.emptyLead}</p>
          </article>
        ) : null}
      </div>
    </AdminShell>
  );
}
