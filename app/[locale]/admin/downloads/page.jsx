import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/downloads/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDownloads");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatStatus(release, page) {
  return release.isPublished ? page.published : page.draft;
}

export default async function AdminDownloadsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "adminDownloads");

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

  const platforms = await listAdminDownloadPlatforms();

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="status-actions">
            <a className="button secondary" href={localizedPath(locale, "/admin/tickets/")}>{page.tickets}</a>
          </div>
          <div className="release-list">
            {platforms.map((platform) => (
              <a className="release" key={platform.key} href={localizedPath(locale, `/admin/downloads/${platform.key}/`)}>
                <div>
                  <h3>{platform.label}</h3>
                  <p>{platform.release.version || page.noVersion}</p>
                </div>
                <span className="pill">{formatStatus(platform.release, page)}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
