import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  metadataBase: new URL("https://www.aifar.com"),
  title: {
    default: "Aifar",
    template: "%s"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Script src="/assets/scripts/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
