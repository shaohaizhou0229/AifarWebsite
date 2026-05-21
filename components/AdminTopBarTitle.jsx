"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function AdminTopBarTitle({ fallbackTitle = "" }) {
  const pathname = usePathname();
  const [title, setTitle] = useState(fallbackTitle);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    function syncTitle() {
      const source = document.querySelector("[data-admin-page-title]");
      const nextTitle = source?.getAttribute("data-admin-page-title") || source?.textContent || fallbackTitle;
      setTitle(nextTitle.trim());

      const breadcrumbSource = document.querySelector("[data-admin-page-breadcrumbs]");
      const nextBreadcrumbs = breadcrumbSource
        ? Array.from(breadcrumbSource.querySelectorAll("[data-admin-breadcrumb-item]")).map((item) => ({
            label: item.textContent?.trim() || "",
            href: item.getAttribute("href") || ""
          })).filter((item) => item.label)
        : [];
      setBreadcrumbs(nextBreadcrumbs);
    }

    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [fallbackTitle, pathname]);

  return (
    <div className="admin-topbar-title" aria-live="polite">
      {breadcrumbs.length ? (
        <nav className="admin-topbar-breadcrumbs" aria-label="Breadcrumbs">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {item.href ? <a href={item.href}>{item.label}</a> : item.label}
            </span>
          ))}
        </nav>
      ) : null}
      <strong>{title}</strong>
    </div>
  );
}
