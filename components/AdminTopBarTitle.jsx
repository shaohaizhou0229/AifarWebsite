"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function AdminTopBarTitle({ fallbackTitle = "" }) {
  const pathname = usePathname();
  const [title, setTitle] = useState(fallbackTitle);

  useEffect(() => {
    function syncTitle() {
      const source = document.querySelector("[data-admin-page-title]");
      const nextTitle = source?.getAttribute("data-admin-page-title") || source?.textContent || fallbackTitle;
      setTitle(nextTitle.trim());
    }

    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [fallbackTitle, pathname]);

  return (
    <div className="admin-topbar-title" aria-live="polite">
      <strong>{title}</strong>
    </div>
  );
}
