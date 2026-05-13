import { locales, localizedPath } from "@/i18n/routing";
import { publicPathnames, siteUrl } from "@/i18n/seo";

export default function sitemap() {
  return publicPathnames.flatMap((pathname) =>
    locales.map((locale) => ({
      url: `${siteUrl}${localizedPath(locale, pathname)}`,
      lastModified: new Date(),
      alternates: {
        languages: locales.reduce((current, alternateLocale) => {
          current[alternateLocale] = `${siteUrl}${localizedPath(alternateLocale, pathname)}`;
          return current;
        }, {})
      }
    }))
  );
}
