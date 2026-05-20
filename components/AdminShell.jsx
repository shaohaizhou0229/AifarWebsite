import Link from "next/link";
import { ChevronDown, Globe2, MoreVertical } from "lucide-react";
import { AdminAutoCloseDetails } from "@/components/AdminAutoCloseDetails";
import { AdminNav } from "@/components/AdminNav";
import { AdminQuickJump } from "@/components/AdminQuickJump";
import { AdminRoutePreloader } from "@/components/AdminRoutePreloader";
import { AdminSidebarCollapse } from "@/components/AdminSidebarCollapse";
import { AdminTopBar } from "@/components/AdminTopBar";
import { SignOutButton } from "@/components/SignOutButton";
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

export function getAdminShellInitials(user, profile) {
  const name = profile?.displayName || user?.user_metadata?.name || user?.email || "A";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function AdminPageHeader({ locale, shell = {}, eyebrow, title, lead, breadcrumbs = [], actions = null }) {
  if (!title && !lead && !eyebrow && !breadcrumbs.length && !actions) return null;

  return (
    <>
      {breadcrumbs.length ? (
        <nav className="admin-breadcrumbs" aria-label={shell.breadcrumbs || "Breadcrumbs"}>
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {item.href ? <Link href={localizedPath(locale, item.href)} prefetch={false}>{item.label}</Link> : item.label}
            </span>
          ))}
        </nav>
      ) : null}
      <header className="admin-page-header">
        <div>
          {eyebrow ? <span className="admin-eyebrow">{eyebrow}</span> : null}
          {title ? <h1>{title}</h1> : null}
          {lead ? <p>{lead}</p> : null}
        </div>
        {actions ? <div className="admin-page-actions">{actions}</div> : null}
      </header>
    </>
  );
}

export function AdminShell({
  locale,
  labels = {},
  current = "",
  title,
  lead,
  eyebrow,
  breadcrumbs = [],
  actions = null,
  user = null,
  children
}) {
  const shell = labels.shell || {};
  const shellUser = user;

  return (
    <main className="admin-shell">
      <AdminRoutePreloader locale={locale} />
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" href={localizedPath(locale, "/admin/")} prefetch={false}>
          <img className="admin-logo-full" src="/assets/images/aifar-logo-full.png" alt={shell.brand || "Aifar"} />
          <img className="admin-logo-mark" src="/assets/images/aifar-logo-mark.png" alt="" aria-hidden="true" />
        </Link>
        <AdminAutoCloseDetails
          className="admin-sidebar-project-menu"
          summaryClassName="admin-sidebar-project"
          summaryLabel={shell.projectName || "Aifar Website"}
          summary={(
            <>
            <Globe2 aria-hidden="true" size={15} strokeWidth={1.8} />
            <span className="admin-project-copy">
              <strong>{shell.projectName || "Aifar Website"}</strong>
            </span>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
            </>
          )}
        >
          <div className="admin-project-popover">
            <Link className="active" href={localizedPath(locale, "/admin/")} prefetch={false}>
              <span className="admin-project-mark">A</span>
              <span>
                <strong>{shell.projectName || "Aifar Website"}</strong>
                <small>{shell.projectCurrent || "Current site"}</small>
              </span>
            </Link>
            <p>{shell.projectTenantHint || "Multi-tenant switching is reserved for a later build."}</p>
          </div>
        </AdminAutoCloseDetails>
        <AdminQuickJump locale={locale} labels={shell} navLabels={labels.nav} />
        <AdminNav locale={locale} labels={labels.nav} current={current} variant="sidebar" />
        <div className="admin-sidebar-spacer" />
        <AdminSidebarCollapse collapseLabel={shell.collapse || "Collapse"} expandLabel={shell.expand || "Expand"} />
        <div className="admin-sidebar-user">
          <Link className="admin-sidebar-avatar" href={localizedPath(locale, "/account/")} prefetch={false}>{shellUser?.initials || "A"}</Link>
          <div>
            <strong>{shellUser?.name || shell.userFallback || "Admin"}</strong>
            <span>{shellUser?.email || shell.userEmailFallback || "admin@aifar.com"}</span>
          </div>
          <AdminAutoCloseDetails
            summaryLabel={shell.account || "Account"}
            summary={<MoreVertical aria-hidden="true" size={16} strokeWidth={1.8} />}
          >
            <div>
              <Link href={localizedPath(locale, "/account/")} prefetch={false}>{shell.account || "Account"}</Link>
              <Link href={localizedPath(locale, "/account/profile/")} prefetch={false}>{shell.notificationPreferences || "Notification preferences"}</Link>
              <SignOutButton labels={shell.auth || { signOut: "Sign out", signingOut: "Signing out..." }} redirectTo={localizedPath(locale, "/")} />
            </div>
          </AdminAutoCloseDetails>
        </div>
      </aside>
      <section className="admin-main">
        <AdminTopBar locale={locale} labels={shell} title={title} user={shellUser} />
        <div className="admin-content">
          <AdminPageHeader
            locale={locale}
            shell={shell}
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />
          {children}
        </div>
      </section>
    </main>
  );
}
