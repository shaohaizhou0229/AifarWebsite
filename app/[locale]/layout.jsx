import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "../globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteAnalyticsTracker } from "@/components/SiteAnalyticsTracker";
import { getLocaleMessages } from "@/i18n/messages";
import { getDirection, isLocale, locales } from "@/i18n/routing";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);

  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader locale={locale} messages={messages} />
          <SiteAnalyticsTracker />
          {children}
          <SiteFooter locale={locale} messages={messages} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
