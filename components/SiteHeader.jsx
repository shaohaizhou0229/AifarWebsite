import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { localizedPath } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenuButton } from "@/components/MobileMenu";
import { SignOutButton } from "@/components/SignOutButton";

const navLinks = [
  ["product", "/product/"],
  ["downloads", "/downloads/"],
  ["whatsNew", "/whats-new/"],
  ["docs", "/docs/"],
  ["support", "/support/"],
  ["contact", "/contact/"]
];

export async function SiteHeader({ locale, messages }) {
  const user = await getCurrentUser();
  const profile = user?.id ? await getProfile(user.id) : null;
  const nav = messages.layout.nav;

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <a className="brand" href={localizedPath(locale, "/")}>
          <span className="brand-mark">A</span>
          <span>{messages.layout.brand}</span>
        </a>
        <MobileMenuButton label={messages.layout.menu} />
        <nav id="site-navigation" className="nav-links" data-nav>
          {navLinks.map(([key, href]) => (
            <a key={href} href={localizedPath(locale, href)}>
              {nav[key]}
            </a>
          ))}
          {profile?.role === "admin" ? <a href={localizedPath(locale, "/admin/")}>{nav.admin}</a> : null}
          {user ? (
            <>
              <a href={localizedPath(locale, "/account/")}>{nav.account}</a>
              <SignOutButton labels={messages.layout.auth} redirectTo={localizedPath(locale, "/")} />
            </>
          ) : (
            <a href={localizedPath(locale, "/login/")}>{nav.signIn}</a>
          )}
          <LanguageSwitcher locale={locale} label={messages.layout.language} />
        </nav>
      </div>
    </header>
  );
}
