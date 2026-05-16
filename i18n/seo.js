import { locales, localizedPath, normalizePathname } from "./routing";

export const siteUrl = "https://www.aifar.com";

export const publicPathnames = [
  "/",
  "/product/",
  "/downloads/",
  "/whats-new/",
  "/docs/",
  "/support/",
  "/contact/",
  "/security/",
  "/login/",
  "/register/",
  "/account/",
  "/account/profile/",
  "/account/tickets/",
  "/admin/tickets/",
  "/admin/users/"
];

export function buildLanguageAlternates(pathname) {
  const normalized = normalizePathname(pathname);
  return locales.reduce(
    (current, locale) => ({
      ...current,
      [locale]: localizedPath(locale, normalized)
    }),
    { "x-default": localizedPath("en", normalized) }
  );
}

export function buildMetadata({ locale, pathname, title, description, image }) {
  const canonical = localizedPath(locale, pathname);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
      languages: buildLanguageAlternates(pathname)
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: image ? [image] : undefined,
      locale
    }
  };
}
