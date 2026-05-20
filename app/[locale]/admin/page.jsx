import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminHome");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminHomePage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);
  const query = await searchParams;
  const rangeDays = [1, 7, 30].includes(Number(query?.range)) ? Number(query.range) : 7;

  let user;
  let profile;
  try {
    const context = await requireAdmin(getProfile);
    user = context.user;
    profile = context.profile;
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  return (
    <AdminShell
      locale={locale}
      labels={page}
      current="home"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      user={{
        name: profile?.displayName || user.email,
        email: profile?.email || user.email,
        initials: (profile?.displayName || user.email || "A").slice(0, 1).toUpperCase()
      }}
    >
      <AdminDashboardClient locale={locale} page={page} rangeDays={rangeDays} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </AdminShell>
  );
}
