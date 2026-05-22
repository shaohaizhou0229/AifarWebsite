import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminAccessDenied, AdminPageHeader } from "@/components/AdminShell";
import { AdminDownloadForm } from "@/components/AdminDownloadForm";
import { AdminVersionTimeline } from "@/components/AdminVersionTimeline";
import { AdminRequiredError } from "@/lib/auth";
import { requireAdminPermissionCached } from "@/lib/admin-context";
import { formatFileSize, getAdminDownloadPlatform, listClientReleaseVersions } from "@/lib/downloads";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { getUploadStatusLabel } from "@/i18n/labels";

const pathname = "/admin/downloads/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDownloadDetail");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminDownloadDetailPage({ params }) {
  const { locale, platform: platformKey } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([
    getPageMessages(locale, "adminDownloadDetail"),
    getLocaleMessages(locale)
  ]);
  const adminHome = await getPageMessages(locale, "adminHome");

  try {
    await requireAdminPermissionCached(ADMIN_PERMISSIONS.downloads);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const [platform, versions] = await Promise.all([
    getAdminDownloadPlatform(platformKey),
    listClientReleaseVersions(platformKey)
  ]);
  if (!platform) notFound();

  const release = platform.release;
  const platformBreadcrumb = `${platform.label}${page.platformBreadcrumbSuffix || ""}`;

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={adminHome.shell}
      eyebrow={page.eyebrow}
      title={platform.label}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: adminHome.nav.downloads, href: "/admin/downloads/" },
        { label: platformBreadcrumb }
      ]}
    />
      <div className="admin-detail-layout">
        <article className="admin-panel detail-card">
          <h3>{page.current}</h3>
          <p>{release.version || page.noVersion}</p>
          <p className="muted-line">{page.status}: {release.isPublished ? page.published : page.draft}</p>
          <p className="muted-line">{messages.forms.downloads.uploadStatus}: {getUploadStatusLabel(messages.forms.downloads, release.uploadStatus)}</p>
          <p className="muted-line">{page.file}: {release.storagePath || release.externalUrl || page.noFile}</p>
          {release.originalFilename ? <p className="muted-line">{page.originalFile}: {release.originalFilename}</p> : null}
          {release.fileSize ? <p className="muted-line">{page.fileSize}: {formatFileSize(release.fileSize)}</p> : null}
          {release.checksumSha256 ? <code className="checksum-line">SHA-256: {release.checksumSha256}</code> : null}
          {release.publishedAt ? <p className="muted-line">{page.publishedAt}: {formatDate(release.publishedAt, locale)}</p> : null}
        </article>
        <AdminDownloadForm platform={platform} labels={messages.forms.downloads} />
        <AdminVersionTimeline
          title={page.history}
          emptyText={page.noHistory}
          restoreLabel={page.restoreVersion}
          restoredLabel={page.restored}
          failedLabel={page.restoreFailed}
          locale={locale}
          items={versions.map((version) => ({
            id: version.id,
            label: page.snapshotTypes?.[version.snapshotType] || version.snapshotType,
            summary: [
              version.version || page.noVersion,
              version.originalFilename,
              getUploadStatusLabel(messages.forms.downloads, version.uploadStatus)
            ].filter(Boolean).join(" - "),
            createdAt: version.createdAt,
            restoreUrl: `/api/admin/downloads/${platform.key}/versions/${version.id}/restore/`
          }))}
        />
      </div>
    </>
  );
}
