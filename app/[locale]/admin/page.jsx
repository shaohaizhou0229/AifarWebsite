import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { getProfile, listAdminUsers } from "@/lib/profiles";
import { listAdminTickets } from "@/lib/tickets";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminHome");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminHomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "adminHome");

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

  const [platforms, tickets, users] = await Promise.all([
    listAdminDownloadPlatforms(),
    listAdminTickets(),
    listAdminUsers()
  ]);
  const publishedCount = platforms.filter((platform) => platform.release.isPublished).length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "closed").length;

  const stats = {
    downloads: `${publishedCount}/${platforms.length}`,
    users: String(users.length),
    contact: String(openTickets),
    product: page.planned,
    docs: page.planned,
    support: page.planned
  };

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <Breadcrumbs locale={locale} items={[{ label: page.nav.home }]} />
          <AdminNav locale={locale} labels={page.nav} current="home" />
          <div className="admin-module-grid">
            {page.modules.map((module) => (
              <a
                className={`admin-module-card ${module.status === "active" ? "active" : "planned"}`}
                key={module.key}
                href={localizedPath(locale, module.href)}
              >
                <div>
                  <span className="pill">{module.status === "active" ? page.active : page.planned}</span>
                  <h2>{module.title}</h2>
                  <p>{module.description}</p>
                </div>
                <strong>{stats[module.key] || ""}</strong>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

