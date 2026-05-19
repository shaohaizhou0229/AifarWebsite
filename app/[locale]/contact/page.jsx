import { setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/contact/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "contact");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([getPageMessages(locale, "contact"), getLocaleMessages(locale)]);
  const user = await getCurrentUser();
  const profile = user?.id ? await getProfile(user.id) : null;
  const initialData = user ? {
    name: profile?.display_name || "",
    workEmail: user.email || "",
    organization: profile?.organization || ""
  } : {};

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <ContactForm initialData={initialData} isLoggedIn={Boolean(user)} labels={messages.forms} locale={locale} />
        </div>
      </section>
    </main>
  );
}
