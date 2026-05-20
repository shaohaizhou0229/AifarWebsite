import { setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/contact/";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "contact");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

const requestTypes = new Set([
  "product_inquiry",
  "technical_support",
  "account_access",
  "client_download",
  "installation",
  "product_usage",
  "bug_report",
  "partnership",
  "other"
]);

export default async function ContactPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([getPageMessages(locale, "contact"), getLocaleMessages(locale)]);
  const requestType = requestTypes.has(query?.type) ? query.type : "product_inquiry";

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <ContactForm labels={messages.forms} locale={locale} initialData={{ requestType }} />
        </div>
      </section>
    </main>
  );
}
