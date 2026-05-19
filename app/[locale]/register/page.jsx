import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForms";
import { PageHero } from "@/components/PageHero";
import { SignOutButton } from "@/components/SignOutButton";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/register/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "register");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function RegisterPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const [page, messages] = await Promise.all([getPageMessages(locale, "register"), getLocaleMessages(locale)]);
  const errorCode = typeof query?.error === "string" ? query.error : "";
  const invitationEmail = typeof query?.email === "string" ? query.email.trim().toLowerCase() : "";
  const initialError = messages.forms.auth.errors?.[errorCode] || "";
  const registerPath = invitationEmail
    ? `${localizedPath(locale, "/register/")}?email=${encodeURIComponent(invitationEmail)}`
    : localizedPath(locale, "/register/");

  if (user) {
    const currentEmail = user.email?.toLowerCase() || "";
    if (invitationEmail && invitationEmail !== currentEmail) {
      return (
        <main>
          <PageHero eyebrow={page.eyebrow} title={page.inviteMismatch.title} lead={page.inviteMismatch.lead} />
          <section className="section alt">
            <div className="section-inner">
              <div className="form-shell auth-card">
                <p><strong>{page.inviteMismatch.signedInAs}</strong> {user.email}</p>
                <p><strong>{page.inviteMismatch.invitedEmail}</strong> {invitationEmail}</p>
                <div className="card-actions">
                  <SignOutButton labels={{ signOut: page.inviteMismatch.action }} redirectTo={registerPath} />
                  <a className="button secondary" href={localizedPath(locale, "/account/")}>{page.inviteMismatch.accountAction}</a>
                </div>
              </div>
            </div>
          </section>
        </main>
      );
    }

    redirect(localizedPath(locale, "/account/"));
  }

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <AuthForm
            mode="register"
            labels={messages.forms}
            accountPath={localizedPath(locale, "/account/")}
            loginPath={localizedPath(locale, "/login/")}
            registerPath={localizedPath(locale, "/register/")}
            initialError={initialError}
            initialEmail={invitationEmail}
            authRedirectPath={localizedPath(locale, "/account/")}
          />
        </div>
      </section>
    </main>
  );
}
