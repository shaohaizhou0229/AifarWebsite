import Link from "next/link";
import { localizedPath } from "@/i18n/routing";
import { ActiveNavLink } from "@/components/ActiveNavLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenuButton } from "@/components/MobileMenu";
import { SiteSessionNav } from "@/components/SiteSessionNav";

const navLinks = [
  ["product", "/product/"],
  ["downloads", "/downloads/"],
  ["whatsNew", "/whats-new/"],
  ["docs", "/docs/"]
];

export function SiteHeader({ locale, messages }) {
  const nav = messages.layout.nav;

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" href={localizedPath(locale, "/")}>
          <img className="brand-logo" src="/assets/images/aifar-logo-full.png" alt={messages.layout.brand} />
        </Link>
        <MobileMenuButton label={messages.layout.menu} />
        <nav id="site-navigation" className="nav-links" data-nav>
          <span className="nav-primary">
            {navLinks.map(([key, href]) => (
              <ActiveNavLink key={href} href={localizedPath(locale, href)} activePaths={[href]}>
                {nav[key]}
              </ActiveNavLink>
            ))}
          </span>
          <span className="nav-session">
            <SiteSessionNav locale={locale} nav={nav} authLabels={messages.layout.auth} />
          </span>
          <LanguageSwitcher locale={locale} label={messages.layout.language} />
        </nav>
      </div>
    </header>
  );
}
