"use client";

import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Box, Download, FileText, Globe2, Home, LifeBuoy, Mail, Users, Workflow } from "lucide-react";

const NAV_ICON_RULES = [
  ["/admin/product/", Box],
  ["/admin/downloads/", Download],
  ["/admin/users/", Users],
  ["/admin/docs/", FileText],
  ["/admin/support/", LifeBuoy],
  ["/admin/contact/", Mail],
  ["/admin/collaboration/", Workflow],
  ["/admin/notifications/", Bell],
  ["/admin/", Home]
];

function stripLocaleFromHref(href) {
  if (!href) return "";
  const normalized = href.endsWith("/") ? href : `${href}/`;
  const match = normalized.match(/^\/[^/]+(\/admin\/.*)$/);
  return match ? match[1] : normalized;
}

function getBreadcrumbIcon(href) {
  const path = stripLocaleFromHref(href);
  const match = NAV_ICON_RULES.find(([prefix]) => path.startsWith(prefix));
  return match?.[1] || null;
}

export function AdminTopBarTitle({ fallbackTitle = "", projectName = "Aifar Website", rootHref = "" }) {
  const pathname = usePathname();
  const [title, setTitle] = useState(fallbackTitle);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    function syncTitle() {
      const source = document.querySelector("[data-admin-page-title]");
      const nextTitle = source?.getAttribute("data-admin-page-title") || source?.textContent || fallbackTitle;
      setTitle(nextTitle.trim());

      const breadcrumbSource = document.querySelector("[data-admin-page-breadcrumbs]");
      const sourceBreadcrumbs = breadcrumbSource
        ? Array.from(breadcrumbSource.querySelectorAll("[data-admin-breadcrumb-item]")).map((item) => ({
            label: item.textContent?.trim() || "",
            href: item.getAttribute("href") || ""
          })).filter((item) => item.label)
        : [];
      const nextBreadcrumbs = sourceBreadcrumbs.filter((item, index) => {
        if (index !== 0) return true;
        return stripLocaleFromHref(item.href) !== "/admin/";
      });
      setBreadcrumbs(nextBreadcrumbs);
    }

    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [fallbackTitle, pathname]);

  return (
    <div className="admin-topbar-title" aria-live="polite">
      <nav className="admin-topbar-breadcrumbs" aria-label="Breadcrumbs">
        <span className="admin-topbar-breadcrumb-root">
          <Globe2 aria-hidden="true" size={14} strokeWidth={1.8} />
          {rootHref ? <a href={rootHref}>{projectName}</a> : projectName}
        </span>
        {(breadcrumbs.length ? breadcrumbs : title ? [{ label: title, href: "" }] : []).map((item, index, list) => {
          const Icon = getBreadcrumbIcon(item.href);
          const isCurrent = index === list.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <span className="admin-topbar-breadcrumb-separator" aria-hidden="true">/</span>
              <span className={isCurrent ? "admin-topbar-breadcrumb-current" : ""}>
                {Icon ? <Icon aria-hidden="true" size={14} strokeWidth={1.8} /> : null}
                {item.href && !isCurrent ? <a href={item.href}>{item.label}</a> : <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>}
              </span>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}
