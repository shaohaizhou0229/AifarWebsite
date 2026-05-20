"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, stripLocale, localizedPath } from "@/i18n/routing";

export function LanguageSwitcher({ locale, label }) {
  const pathname = usePathname();
  const currentPath = stripLocale(pathname);

  return (
    <div className="language-switcher" aria-label={label}>
      {locales.map((code) => (
        <Link
          className="language-option"
          key={code}
          href={localizedPath(code, currentPath)}
          aria-pressed={String(code === locale)}
          hrefLang={code}
        >
          {code === "zh-CN" ? "中" : code.toUpperCase()}
          <span className="sr-only">{localeLabels[code]}</span>
        </Link>
      ))}
    </div>
  );
}
