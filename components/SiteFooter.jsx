"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizedPath, stripLocale } from "@/i18n/routing";

export function SiteFooter({ locale, messages }) {
  const pathname = usePathname();
  const full = stripLocale(pathname) === "/";
  const footer = messages.layout.footer;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-brand">
          <img className="footer-brand-logo" src="/assets/images/aifar-logo-full.png" alt="" aria-hidden="true" />
          <span>{full ? footer.full : footer.short}</span>
        </span>
        <div className="footer-links">
          <Link href={localizedPath(locale, "/security/")}>{footer.security}</Link>
          <Link href={localizedPath(locale, "/docs/")}>{footer.docs}</Link>
          <Link href={localizedPath(locale, "/contact/")}>{footer.contact}</Link>
        </div>
      </div>
    </footer>
  );
}
