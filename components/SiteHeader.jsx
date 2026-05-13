import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { SignOutButton } from "@/components/SignOutButton";

const navLinks = [
  { href: "/product/", label: "Product" },
  { href: "/downloads/", label: "Downloads" },
  { href: "/whats-new/", label: "What's New" },
  { href: "/docs/", label: "Docs" },
  { href: "/support/", label: "Support" },
  { href: "/contact/", label: "Contact" }
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = user?.id ? await getProfile(user.id) : null;

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>Aifar</span>
        </a>
        <button className="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" data-menu-toggle>
          <span />
        </button>
        <nav className="nav-links" data-nav>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          {profile?.role === "admin" ? <a href="/admin/tickets/">Admin</a> : null}
          {user ? (
            <>
              <a href="/account/">Account</a>
              <SignOutButton />
            </>
          ) : (
            <a href="/login/">Sign in</a>
          )}
        </nav>
      </div>
    </header>
  );
}
