"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const full = pathname === "/";

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>{full ? "漏 2026 Aifar. All rights reserved." : "漏 2026 Aifar."}</span>
        <div className="footer-links">
          <a href="/security/">Security</a>
          <a href="/docs/">Documentation</a>
          <a href="/contact/">Contact</a>
        </div>
      </div>
    </footer>
  );
}
