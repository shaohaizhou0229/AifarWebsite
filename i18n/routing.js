import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh-CN", "fr", "ar"];
export const defaultLocale = "en";
export const activeLocales = ["en", "zh-CN"];

export const localeLabels = {
  en: "English",
  "zh-CN": "简体中文",
  fr: "Français",
  ar: "العربية"
};

export const localeDirections = {
  en: "ltr",
  "zh-CN": "ltr",
  fr: "ltr",
  ar: "rtl"
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export function isLocale(value) {
  return locales.includes(value);
}

export function getDirection(locale) {
  return localeDirections[locale] || "ltr";
}

export function normalizePathname(pathname = "/") {
  if (!pathname || pathname === "/") return "/";
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function localizedPath(locale, pathname = "/") {
  const normalized = normalizePathname(pathname);
  return normalized === "/" ? `/${locale}/` : `/${locale}${normalized}`;
}

export function stripLocale(pathname = "/") {
  const normalized = normalizePathname(pathname);
  const [, first, ...rest] = normalized.split("/");
  if (!isLocale(first)) return normalized;
  const stripped = `/${rest.join("/")}`;
  return normalizePathname(stripped);
}
