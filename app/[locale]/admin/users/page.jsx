import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile, listAdminUsers } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/users/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminUsers");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminUsersPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminUsers"),
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

  const query = await searchParams;
  const q = typeof query?.q === "string" ? query.q.trim() : "";
  const users = await listAdminUsers(q);

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
          <AdminNav locale={locale} labels={adminHome.nav} current="users" />
          <form className="admin-search" action={localizedPath(locale, "/admin/users/")}>
            <label className="sr-only" htmlFor="q">{page.searchLabel}</label>
            <input id="q" name="q" defaultValue={q} placeholder={page.searchPlaceholder} />
            <button className="button secondary" type="submit">{page.searchAction}</button>
          </form>
          <div className="release-list">
            {users.length ? users.map((user) => (
              <a className="release" key={user.id} href={localizedPath(locale, `/admin/users/${user.id}/`)}>
                <div>
                  <h3>{user.displayName || user.email}</h3>
                  <p>{user.email} - {user.organization || page.notProvided}</p>
                  <p className="muted-line">{page.createdAt}: {formatDate(user.createdAt, locale)}</p>
                </div>
                <div className="admin-user-meta">
                  <span className="pill">{page.roles[user.role] || user.role}</span>
                  <span>{page.tickets}: {user.ticketCount}</span>
                  <span>{page.lastFootprint}: {formatDate(user.lastFootprintAt, locale) || page.notProvided}</span>
                </div>
              </a>
            )) : (
              <article className="card admin-empty-state">
                <h2>{page.emptyTitle}</h2>
                <p>{page.emptyLead}</p>
              </article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
