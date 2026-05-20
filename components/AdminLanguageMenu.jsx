"use client";

import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { localeLabels, locales, stripLocale, localizedPath } from "@/i18n/routing";

function shortLocale(code) {
  if (code === "zh-CN") return "中";
  return code.toUpperCase();
}

export function AdminLanguageMenu({ locale, label }) {
  const pathname = usePathname();
  const currentPath = stripLocale(pathname);

  return (
    <details className="admin-language-menu">
      <summary aria-label={label}>
        <span>{shortLocale(locale)}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </summary>
      <div className="admin-language-menu-list">
        {locales.map((code) => (
          <a
            aria-current={code === locale ? "true" : undefined}
            href={localizedPath(code, currentPath)}
            hrefLang={code}
            key={code}
          >
            <span>{shortLocale(code)}</span>
            <small>{localeLabels[code]}</small>
          </a>
        ))}
      </div>
    </details>
  );
}
