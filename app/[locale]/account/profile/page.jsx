import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountDeletionForm } from "@/components/AccountDeletionForm";
import { PageHero } from "@/components/PageHero";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/account/profile/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "profile");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AccountProfilePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizedPath(locale, "/login/"));

  const [page, messages, profile] = await Promise.all([
    getPageMessages(locale, "profile"),
    getLocaleMessages(locale),
    ensureProfile(user)
  ]);

  if (!isProfileActive(profile)) redirect(localizedPath(locale, "/login/"));

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <ProfileForm profile={profile} labels={messages.forms} />
          <AccountDeletionForm labels={page.deleteAccount} redirectPath={localizedPath(locale, "/login/")} />
        </div>
      </section>
    </main>
  );
}
