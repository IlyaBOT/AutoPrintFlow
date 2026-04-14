import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { ThemeLanguageControls } from "@/components/layout/theme-language-controls";
import { Button } from "@/components/ui/button";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  return (
    <header className="page-shell relative z-[80] pb-0">
      <div className="glass-panel flex items-center justify-between rounded-[32px] px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-sky-400 dark:text-slate-950">
            <NerdIcon className="text-lg" name="star" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/75">
              AutoPrintFlow
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{t("header.tagline")}</div>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:block"
              >
                {user.role === "ADMIN" ? t("header.admin") : t("header.dashboard")}
              </Link>
              <Button asChild size="sm" variant="secondary">
                <Link href="/editor/new">{t("header.createLayout")}</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/logout" prefetch={false}>
                  {t("header.logout")}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">{t("header.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("header.createAccount")}</Link>
              </Button>
            </>
          )}
          <ThemeLanguageControls locale={locale} />
        </nav>
      </div>
    </header>
  );
}
