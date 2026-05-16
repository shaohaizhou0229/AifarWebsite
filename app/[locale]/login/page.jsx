import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForms";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/login/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "login");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function LoginPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (user) redirect(localizedPath(locale, "/account/"));

  const [page, messages] = await Promise.all([getPageMessages(locale, "login"), getLocaleMessages(locale)]);
  const errorCode = typeof query?.error === "string" ? query.error : "";
  const initialError = messages.forms.auth.errors?.[errorCode] || "";

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <AuthForm
            mode="login"
            labels={messages.forms}
            accountPath={localizedPath(locale, "/account/")}
            loginPath={localizedPath(locale, "/login/")}
            registerPath={localizedPath(locale, "/register/")}
            initialError={initialError}
          />
        </div>
      </section>
    </main>
  );
}
