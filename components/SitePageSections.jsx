import Link from "next/link";
import { Card } from "@/components/Card";
import { Release } from "@/components/Rows";
import { localizedPath } from "@/i18n/routing";

function resolveHref(locale, href = "") {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) return href;
  return localizedPath(locale, href);
}

function isClientRoutableHref(href = "") {
  return href.startsWith("/") && !href.startsWith("/api/");
}

function SiteActionLink({ className, href, children }) {
  if (!href) return null;
  if (isClientRoutableHref(href)) {
    return <Link className={className} href={href}>{children}</Link>;
  }
  return <a className={className} href={href}>{children}</a>;
}

function sectionTone(section) {
  return section?.settings?.tone === "alt" ? " section alt" : "section";
}

function SectionHead({ title, lead, actionLabel, actionHref, locale }) {
  if (!title && !lead && !actionLabel) return null;
  return (
    <div className="section-head">
      <div>
        {title ? <h2>{title}</h2> : null}
        {lead ? <p>{lead}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <SiteActionLink className="button secondary" href={resolveHref(locale, actionHref)}>{actionLabel}</SiteActionLink>
      ) : null}
    </div>
  );
}

function HeroSection({ section, locale }) {
  const content = section.content || {};
  const hasActions = content.primaryCta || content.secondaryCta;
  const hasImage = content.heroImageUrl || content.heroImagePath;

  if (section.variant === "simple") {
    return (
      <section className="page-hero">
        <div className="section-inner">
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          <h1>{content.title}</h1>
          {content.lead ? <p className="lead">{content.lead}</p> : null}
          {hasActions ? (
            <div className="actions">
              {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
              {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="hero home-hero" style={{ "--home-hero-image": `url("${content.heroImageUrl || "/assets/images/aifar-hero.png"}")` }}>
      <div className="section-inner hero-grid home-hero-grid">
        <div className="hero-copy">
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          <h1>{content.title}</h1>
          {content.lead ? <p className="lead">{content.lead}</p> : null}
          {hasActions ? (
            <div className="actions">
              {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
              {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
            </div>
          ) : null}
        </div>
        {hasImage ? (
          <div className="hero-media product-stage">
            <img src={content.heroImageUrl || content.heroImagePath} alt={content.heroAlt || content.title || ""} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TrustBarSection({ section }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  if (!items.length) return null;

  return (
    <section className="section section-tight">
      <div className="section-inner trust-row" aria-label={content.ariaLabel || undefined}>
        {items.map(([value, label], index) => (
          <div key={`${value}-${index}`}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardGridSection({ section, locale }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const columns = section.variant === "three" ? "three" : "four";

  return (
    <section className={sectionTone(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} actionLabel={content.actionLabel} actionHref={content.actionHref} locale={locale} />
        <div className={`grid ${columns}`}>
          {items.map(([icon, title, description], index) => (
            <Card icon={icon} title={title} key={`${title}-${index}`}>{description}</Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureListSection({ section }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items : [];

  return (
    <section className={sectionTone(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className="feature-list">
          {items.map(([title, description], index) => (
            <div className="feature" key={`${title}-${index}`}>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaFeatureSection({ section }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const isImageOnly = section.variant === "image-only";

  return (
    <section className={sectionTone(section)}>
      <div className="section-inner">
        {isImageOnly ? (
          <div className="hero-media product-page-media">
            <img src={content.imageUrl || content.imagePath} alt={content.imageAlt || content.title || ""} />
          </div>
        ) : (
          <div className="media-feature">
            <div>
              {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
              {content.title ? <h2>{content.title}</h2> : null}
              {content.lead ? <p>{content.lead}</p> : null}
              {items.length ? (
                <div className="feature-list compact">
                  {items.map(([title, description], index) => (
                    <div className="feature" key={`${title}-${index}`}>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {content.imageUrl || content.imagePath ? (
              <div className="hero-media">
                <img src={content.imageUrl || content.imagePath} alt={content.imageAlt || content.title || ""} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function UpdatesSection({ section, locale }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items : [];

  return (
    <section className={sectionTone(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} actionLabel={content.actionLabel} actionHref={content.actionHref} locale={locale} />
        <div className="release-list">
          {items.map(([title, description, pill], index) => (
            <Release title={title} description={description} pill={pill} key={`${title}-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ section, locale }) {
  const content = section.content || {};

  return (
    <section className={sectionTone(section)}>
      <div className="section-inner cta-band">
        {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
        <h2>{content.title}</h2>
        {content.lead ? <p>{content.lead}</p> : null}
        <div className="actions">
          {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
          {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
        </div>
      </div>
    </section>
  );
}

export function SitePageSections({ page, locale }) {
  const sections = Array.isArray(page?.sections) ? page.sections : [];

  return (
    <>
      {sections.map((section) => {
        if (section.type === "hero") return <HeroSection section={section} locale={locale} key={section.id} />;
        if (section.type === "trust_bar") return <TrustBarSection section={section} key={section.id} />;
        if (section.type === "card_grid" || section.type === "capability_matrix") return <CardGridSection section={section} locale={locale} key={section.id} />;
        if (section.type === "feature_list") return <FeatureListSection section={section} key={section.id} />;
        if (section.type === "media_feature") return <MediaFeatureSection section={section} key={section.id} />;
        if (section.type === "updates_list") return <UpdatesSection section={section} locale={locale} key={section.id} />;
        if (section.type === "cta_band") return <CtaSection section={section} locale={locale} key={section.id} />;
        return null;
      })}
    </>
  );
}
