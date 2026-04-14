import type { Metadata } from "next";

import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { getMessages, THEME_COOKIE_NAME } from "@/lib/i18n";
import { getLocale, getThemeOverride } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "AutoPrintFlow",
  description: "AutoPrintFlow",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, themeOverride] = await Promise.all([getLocale(), getThemeOverride()]);
  const messages = getMessages(locale);
  const themeScript = `
  (function() {
    try {
      var cookieMatch = document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]+)/);
      var cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      var theme = cookieTheme === "dark" || cookieTheme === "light"
        ? cookieTheme
        : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    } catch (error) {}
  })();
  `;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={themeOverride === "dark" ? "dark" : undefined}
      style={themeOverride ? { colorScheme: themeOverride } : undefined}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <I18nProvider locale={locale} messages={messages}>
          <div className="relative overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 bg-sheet-grid bg-[length:80px_80px] opacity-[0.18]" />
            <div className="relative z-10 min-h-screen">
              <SiteHeader />
              {children}
            </div>
          </div>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
