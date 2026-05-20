import { ChevronDown, ChevronsLeft, Globe2, MoreVertical, Search } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { AdminTopBar } from "@/components/AdminTopBar";
import { SignOutButton } from "@/components/SignOutButton";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { localizedPath } from "@/i18n/routing";

export function AdminAccessDenied({ title, lead }) {
  return (
    <main className="admin-denied">
      <article className="admin-panel admin-denied-panel">
        <span className="admin-eyebrow">Admin</span>
        <h1>{title}</h1>
        <p>{lead}</p>
      </article>
    </main>
  );
}

function getInitials(user, profile) {
  const name = profile?.displayName || user?.user_metadata?.name || user?.email || "A";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

async function resolveShellUser(currentUser) {
  if (currentUser) return currentUser;

  try {
    const user = await getCurrentUser();
    const profile = user?.id ? await getProfile(user.id) : null;
    return {
      name: profile?.displayName || user?.user_metadata?.name || user?.email || "Admin",
      email: profile?.email || user?.email || "",
      initials: getInitials(user, profile)
    };
  } catch {
    return null;
  }
}

export async function AdminShell({
  locale,
  labels = {},
  current = "home",
  title,
  lead,
  eyebrow,
  breadcrumbs = [],
  actions = null,
  user = null,
  children
}) {
  const shell = labels.shell || {};
  const shellUser = await resolveShellUser(user);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-sidebar-brand" href={localizedPath(locale, "/admin/")}>
          <img src="/assets/images/aifar-logo-full.png" alt={shell.brand || "Aifar"} />
        </a>
        <button className="admin-sidebar-project" type="button">
          <Globe2 aria-hidden="true" size={15} strokeWidth={1.8} />
          <strong>{shell.projectName || "Aifar Website"}</strong>
          <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
        <label className="admin-sidebar-search">
          <Search aria-hidden="true" size={14} strokeWidth={1.8} />
          <span className="sr-only">{shell.search || "Search"}</span>
          <input placeholder={shell.search || "Search"} />
          <kbd>{shell.searchShortcut || "Ctrl K"}</kbd>
        </label>
        <AdminNav locale={locale} labels={labels.nav} current={current} variant="sidebar" />
        <div className="admin-sidebar-spacer" />
        <button className="admin-sidebar-collapse" type="button">
          <ChevronsLeft aria-hidden="true" size={14} strokeWidth={1.8} />
          <span>{shell.collapse || "Collapse"}</span>
        </button>
        <div className="admin-sidebar-user">
          <a className="admin-sidebar-avatar" href={localizedPath(locale, "/account/")}>{shellUser?.initials || "A"}</a>
          <div>
            <strong>{shellUser?.name || shell.userFallback || "Admin"}</strong>
            <span>{shellUser?.email || shell.userEmailFallback || "admin@aifar.com"}</span>
          </div>
          <details>
            <summary aria-label={shell.account || "Account"}>
              <MoreVertical aria-hidden="true" size={16} strokeWidth={1.8} />
            </summary>
            <div>
              <a href={localizedPath(locale, "/account/")}>{shell.account || "Account"}</a>
              <a href={localizedPath(locale, "/account/notifications/")}>{shell.notifications || "Notifications"}</a>
              <SignOutButton labels={shell.auth || { signOut: "Sign out", signingOut: "Signing out..." }} redirectTo={localizedPath(locale, "/")} />
            </div>
          </details>
        </div>
      </aside>
      <section className="admin-main">
        <AdminTopBar locale={locale} labels={shell} title={title} user={shellUser} />
        <div className="admin-content">
          {breadcrumbs.length ? (
            <nav className="admin-breadcrumbs" aria-label={shell.breadcrumbs || "Breadcrumbs"}>
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`}>
                  {item.href ? <a href={localizedPath(locale, item.href)}>{item.label}</a> : item.label}
                </span>
              ))}
            </nav>
          ) : null}
          <header className="admin-page-header">
            <div>
              {eyebrow ? <span className="admin-eyebrow">{eyebrow}</span> : null}
              <h1>{title}</h1>
              {lead ? <p>{lead}</p> : null}
            </div>
            {actions ? <div className="admin-page-actions">{actions}</div> : null}
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
