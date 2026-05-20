import { AdminNav } from "@/components/AdminNav";
import { AdminTopBar } from "@/components/AdminTopBar";
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

export function AdminShell({
  locale,
  labels = {},
  current = "home",
  title,
  lead,
  eyebrow,
  breadcrumbs = [],
  actions = null,
  children
}) {
  const shell = labels.shell || {};

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-sidebar-brand" href={localizedPath(locale, "/admin/")}>
          <img src="/assets/images/aifar-logo-full.png" alt={shell.brand || "Aifar"} />
        </a>
        <div className="admin-sidebar-project">
          <span>{shell.projectLabel || "Project"}</span>
          <strong>{shell.projectName || "Aifar Website"}</strong>
        </div>
        <AdminNav locale={locale} labels={labels.nav} current={current} variant="sidebar" />
      </aside>
      <section className="admin-main">
        <AdminTopBar locale={locale} labels={shell} title={title} />
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
