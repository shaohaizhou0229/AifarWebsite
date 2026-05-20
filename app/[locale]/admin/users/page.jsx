import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminInviteUserForm } from "@/components/AdminInviteUserForm";
import { AdminUsersClient } from "@/components/AdminUsersClient";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/users/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminUsers");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminUsersPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminUsers"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const query = await searchParams;
  const q = typeof query?.q === "string" ? query.q.trim() : "";
  const status = typeof query?.status === "string" ? query.status : "all";

  return (
    <AdminShell
      locale={locale}
      labels={adminHome}
      current="users"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      breadcrumbs={[
        { label: adminHome.nav.home, href: "/admin/" },
        { label: page.breadcrumb }
      ]}
    >
      <article className="admin-panel detail-card">
        <h2>{page.invite.title}</h2>
        <p>{page.invite.lead}</p>
        <AdminInviteUserForm labels={page.invite.form} />
      </article>
      <AdminUsersClient locale={locale} page={page} initialQuery={q} initialStatus={status} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </AdminShell>
  );
}
