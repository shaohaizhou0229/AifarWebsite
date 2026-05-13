import { setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { Release } from "@/components/Rows";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "home");
  return buildMetadata({
    locale,
    pathname,
    title: page.seo.title,
    description: page.seo.description,
    image: "/assets/images/aifar-hero.png"
  });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "home");
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Aifar",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, iOS, Android",
    description: page.schemaDescription,
    featureList: ["Chat", "Meeting", "Email", "Contact", "Documents", "Workflow", "Forms"]
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="hero">
        <div className="section-inner hero-grid">
          <div>
            <p className="eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p className="lead">{page.lead}</p>
            <div className="actions">
              <a className="button primary" href={localizedPath(locale, "/downloads/")}>{page.primaryCta}</a>
              <a className="button secondary" href={localizedPath(locale, "/contact/")}>{page.secondaryCta}</a>
            </div>
          </div>
          <div className="hero-media">
            <img src="/assets/images/aifar-hero.png" alt={page.heroAlt} />
          </div>
        </div>
        <div className="section-inner trust-row" aria-label={page.trustLabel}>
          {page.trust.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <div className="section-head">
            <h2>{page.modulesTitle}</h2>
            <p>{page.modulesLead}</p>
          </div>
          <div className="grid four">
            {page.modules.map(([icon, title, description]) => (
              <Card icon={icon} title={title} key={title}>{description}</Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-head">
            <h2>{page.managedTitle}</h2>
            <p>{page.managedLead}</p>
          </div>
          <div className="feature-list">
            {page.features.map(([title, description]) => (
              <div className="feature" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <div className="section-head">
            <h2>{page.updatesTitle}</h2>
            <a className="button secondary" href={localizedPath(locale, "/whats-new/")}>{page.viewAll}</a>
          </div>
          <div className="release-list">
            {page.updates.map(([title, description, pill]) => (
              <Release title={title} description={description} pill={pill} key={title} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner cta-band">
          <p className="eyebrow">{page.ctaEyebrow}</p>
          <h2>{page.ctaTitle}</h2>
          <p>{page.ctaLead}</p>
          <div className="actions">
            <a className="button primary" href={localizedPath(locale, "/downloads/")}>{page.ctaPrimary}</a>
            <a className="button secondary" href={localizedPath(locale, "/support/")}>{page.ctaSecondary}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
