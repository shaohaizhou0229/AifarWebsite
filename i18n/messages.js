import { defaultLocale, isLocale } from "./routing";

const loaders = {
  en: () => import("../messages/en.json"),
  "zh-CN": () => import("../messages/zh-CN.json"),
  fr: () => import("../messages/fr.json"),
  ar: () => import("../messages/ar.json")
};

export async function getLocaleMessages(locale) {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  return (await loaders[safeLocale]()).default;
}

export async function getPageMessages(locale, pageKey) {
  const messages = await getLocaleMessages(locale);
  const page = messages.pages[pageKey];
  if (!page) {
    throw new Error(`Missing page messages for "${pageKey}" in locale "${locale}".`);
  }
  return page;
}
