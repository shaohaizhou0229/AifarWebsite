import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
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
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminDownloads"),
    getPageMessages(locale, "adminHome")
  ]);
  const adminNav = adminHome.nav;

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
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
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminNav.home, href: "/admin/" },
              { label: page.breadcrumb }
            ]}
          />
          <AdminNav locale={locale} labels={adminNav} current="downloads" />
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
