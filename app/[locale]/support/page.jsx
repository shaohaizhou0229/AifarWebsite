import { setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/support/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "support");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function SupportPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "support");

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="grid three">
            {page.items.map(([icon, title, description]) => (
              <Card key={title} icon={icon} title={title}>{description}</Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
