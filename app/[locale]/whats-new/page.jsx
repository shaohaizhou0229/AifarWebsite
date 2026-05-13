import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { Release } from "@/components/Rows";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/whats-new/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "whatsNew");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function WhatsNewPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "whatsNew");

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="release-list">
            {page.items.map(([title, description, pill]) => (
              <Release key={title} title={title} description={description} pill={pill} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
