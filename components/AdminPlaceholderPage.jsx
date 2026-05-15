import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { localizedPath } from "@/i18n/routing";

export async function AdminPlaceholderPage({ locale, page, nav, sectionKey }) {
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

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: nav.home, href: "/admin/" },
              { label: page.breadcrumb || page.title }
            ]}
          />
          <AdminNav locale={locale} labels={nav} current={sectionKey} />
          <article className="card admin-empty-state">
            <span className="pill">{page.status}</span>
            <h2>{page.emptyTitle}</h2>
            <p>{page.emptyLead}</p>
          </article>
        </div>
      </section>
    </main>
  );
}

