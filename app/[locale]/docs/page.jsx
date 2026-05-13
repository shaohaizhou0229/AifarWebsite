import { setRequestLocale } from "next-intl/server";
import { DocLink } from "@/components/Rows";
import { PageHero } from "@/components/PageHero";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/docs/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "docs");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function DocsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "docs");

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="doc-list">
            {page.items.map(([title, description, pill]) => (
              <DocLink key={title} title={title} description={description} pill={pill} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
