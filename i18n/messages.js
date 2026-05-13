import { defaultLocale, isLocale } from "./routing";

const loaders = {
  en: () => import("../messages/en.json"),
  "zh-CN": () => import("../messages/zh-CN.json"),
  fr: () => import("../messages/fr.json"),
  ar: () => import("../messages/ar.json")
};

export async function getLocaleMessages(locale) {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  const defaultMessages = (await loaders[defaultLocale]()).default;
  if (safeLocale === defaultLocale) return defaultMessages;

  const localeMessages = (await loaders[safeLocale]()).default;
  return mergeMessages(defaultMessages, localeMessages);
}

export async function getPageMessages(locale, pageKey) {
  const messages = await getLocaleMessages(locale);
  return messages.pages[pageKey];
}

function mergeMessages(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override ?? base;
  }

  return Object.keys(base).reduce((current, key) => {
    current[key] = mergeMessages(base[key], override[key]);
    return current;
  }, { ...override });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
