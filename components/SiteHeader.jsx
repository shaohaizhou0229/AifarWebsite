import { getCurrentUser } from "@/lib/auth";
import { getProfile, isProfileActive } from "@/lib/profiles";
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
          <img className="brand-logo" src="/assets/images/aifar-logo-full.png" alt={messages.layout.brand} />
        </a>
        <MobileMenuButton label={messages.layout.menu} />
        <nav id="site-navigation" className="nav-links" data-nav>
          <span className="nav-primary">
            {navLinks.map(([key, href]) => (
              <a key={href} href={localizedPath(locale, href)}>
                {nav[key]}
              </a>
            ))}
          </span>
          <span className="nav-session">
            {profile?.role === "admin" && isProfileActive(profile) ? (
              <a className="nav-admin-link" href={localizedPath(locale, "/admin/")}>{nav.admin}</a>
            ) : null}
            {user && isProfileActive(profile) ? (
              <>
                <a className="nav-account-link" href={localizedPath(locale, "/account/")}>{nav.account}</a>
                <SignOutButton labels={messages.layout.auth} redirectTo={localizedPath(locale, "/")} />
              </>
            ) : (
              <a className="nav-login-link" href={localizedPath(locale, "/login/")}>{nav.signIn}</a>
            )}
          </span>
          <LanguageSwitcher locale={locale} label={messages.layout.language} />
        </nav>
      </div>
    </header>
  );
}
