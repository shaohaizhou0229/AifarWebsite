"use client";

import { usePathname } from "next/navigation";
import { localizedPath, stripLocale } from "@/i18n/routing";

export function SiteFooter({ locale, messages }) {
  const pathname = usePathname();
  const full = stripLocale(pathname) === "/";
  const footer = messages.layout.footer;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>{full ? footer.full : footer.short}</span>
        <div className="footer-links">
          <a href={localizedPath(locale, "/security/")}>{footer.security}</a>
          <a href={localizedPath(locale, "/docs/")}>{footer.docs}</a>
          <a href={localizedPath(locale, "/contact/")}>{footer.contact}</a>
        </div>
      </div>
    </footer>
  );
}
