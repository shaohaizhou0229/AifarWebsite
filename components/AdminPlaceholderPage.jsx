import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { localizedPath } from "@/i18n/routing";

export async function AdminPlaceholderPage({ locale, page, nav, sectionKey, permission }) {
  try {
    await requireAdminPermission(getProfile, permission);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  return (
    <AdminShell
      locale={locale}
      labels={{ nav }}
      current={sectionKey}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: nav.home, href: "/admin/" },
        { label: page.breadcrumb || page.title }
      ]}
    >
      <article className="admin-panel admin-empty-state">
        <span className="admin-status admin-status-neutral">{page.status}</span>
        <h2>{page.emptyTitle}</h2>
        <p>{page.emptyLead}</p>
      </article>
    </AdminShell>
  );
}
