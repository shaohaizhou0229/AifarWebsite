import { getCurrentUser } from "@/lib/auth";
import { getProfile, isProfileActive } from "@/lib/profiles";
import { countUnreadNotifications } from "@/lib/notifications";
import { localizedPath } from "@/i18n/routing";
import { ActiveNavLink } from "@/components/ActiveNavLink";
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
  const unreadNotifications = user?.id && isProfileActive(profile) ? await countUnreadNotifications(user.id) : 0;
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
              <ActiveNavLink key={href} href={localizedPath(locale, href)} activePaths={[href]}>
                {nav[key]}
              </ActiveNavLink>
            ))}
          </span>
          <span className="nav-session">
            {profile?.role === "admin" && isProfileActive(profile) ? (
              <ActiveNavLink className="nav-admin-link" href={localizedPath(locale, "/admin/")} activePaths={["/admin/"]}>{nav.admin}</ActiveNavLink>
            ) : null}
            {user && isProfileActive(profile) ? (
              <>
                <ActiveNavLink
                  className="nav-account-link"
                  href={localizedPath(locale, "/account/")}
                  exactActivePaths={["/account/"]}
                  activePaths={["/account/profile/", "/account/tickets/"]}
                >
                  {nav.account}
                </ActiveNavLink>
                <ActiveNavLink className="nav-account-link" href={localizedPath(locale, "/account/notifications/")} activePaths={["/account/notifications/"]}>
                  {nav.notifications}{unreadNotifications ? ` (${unreadNotifications})` : ""}
                </ActiveNavLink>
                <SignOutButton labels={messages.layout.auth} redirectTo={localizedPath(locale, "/")} />
              </>
            ) : (
              <ActiveNavLink className="nav-login-link" href={localizedPath(locale, "/login/")} activePaths={["/login/", "/register/"]}>{nav.signIn}</ActiveNavLink>
            )}
          </span>
          <LanguageSwitcher locale={locale} label={messages.layout.language} />
        </nav>
      </div>
    </header>
  );
}
