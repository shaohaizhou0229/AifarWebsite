import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminRequiredError } from "@/lib/auth";
import { getAdminShellContext } from "@/lib/admin-context";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "adminHome");

  let context;
  try {
    context = await getAdminShellContext();
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  return (
    <AdminShell locale={locale} labels={page} user={context.shellUser}>
      {children}
    </AdminShell>
  );
}
