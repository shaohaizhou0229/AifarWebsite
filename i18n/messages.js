import { defaultLocale, isLocale } from "./routing";
import enMessages from "../messages/en.json";
import zhCNMessages from "../messages/zh-CN.json";
import frMessages from "../messages/fr.json";
import arMessages from "../messages/ar.json";

const messagesByLocale = {
  en: enMessages,
  "zh-CN": zhCNMessages,
  fr: frMessages,
  ar: arMessages
};

export async function getLocaleMessages(locale) {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  return messagesByLocale[safeLocale];
}

export async function getPageMessages(locale, pageKey) {
  const messages = await getLocaleMessages(locale);
  const page = messages.pages[pageKey];
  if (!page) {
    throw new Error(`Missing page messages for "${pageKey}" in locale "${locale}".`);
  }
  return page;
}
