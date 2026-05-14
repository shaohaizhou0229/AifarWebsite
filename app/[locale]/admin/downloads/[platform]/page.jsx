import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminDownloadForm } from "@/components/AdminDownloadForm";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { formatFileSize, getAdminDownloadPlatform } from "@/lib/downloads";
import { getProfile } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

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

  const platform = await getAdminDownloadPlatform(platformKey);
  if (!platform) notFound();

  const release = platform.release;

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={platform.label} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <article className="card detail-card">
            <h3>{page.current}</h3>
            <p>{release.version || page.noVersion}</p>
            <p className="muted-line">{page.status}: {release.isPublished ? page.published : page.draft}</p>
            <p className="muted-line">{page.file}: {release.storagePath || release.externalUrl || page.noFile}</p>
            {release.fileSize ? <p className="muted-line">{page.fileSize}: {formatFileSize(release.fileSize)}</p> : null}
            {release.publishedAt ? <p className="muted-line">{page.publishedAt}: {formatDate(release.publishedAt, locale)}</p> : null}
          </article>
          <AdminDownloadForm platform={platform} labels={messages.forms.downloads} />
        </div>
      </section>
    </main>
  );
}
