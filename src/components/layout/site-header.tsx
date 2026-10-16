import Link from "next/link";
import { Plus } from "lucide-react";

import { logoutAction } from "@/app/actions/logout";
import { getCurrentUser } from "@/lib/auth/session";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { ThemeLanguageControls } from "@/components/layout/theme-language-controls";
import { Button } from "@/components/ui/button";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getSystemSettings } from "@/lib/system-settings";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const settings = await getSystemSettings();
  const messages = getMessages(locale);
  const t = (
    key: string,
    values?: Record<string, string | number | null | undefined>,
  ) => translate(messages, key, values);

  return (
    <header className="page-shell relative z-[80] pb-0">
      <div className="glass-panel site-navigation flex items-center justify-between gap-2 rounded-[24px] px-3 py-3 sm:px-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-slate-900 dark:text-slate-100"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-950 text-white shadow-sm dark:bg-sky-400 dark:text-slate-950">
            {settings.instanceIconFilePath ? (
              <img
                src="/api/system-settings/asset?kind=icon"
                alt=""
                className="h-7 w-7 rounded-lg object-cover"
              />
            ) : (
              <NerdIcon className="text-xl" name="sticker" />
            )}
          </div>
          <div className="min-w-0">
            <div className="max-w-[140px] truncate text-sm font-extrabold tracking-tight sm:max-w-none">
              {settings.instanceName}
            </div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">
              {t("header.tagline")}
            </div>
          </div>
        </Link>
        <nav
          className="flex shrink-0 items-center gap-2"
          aria-label={locale === "ru" ? "Навигация" : "Navigation"}
        >
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                    {locale === "ru" ? "Мои заказы" : "Workspace"}
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/editor/new">
                    <Plus size={16} />
                    {t("header.createLayout")}
                  </Link>
                </Button>
                <form action={logoutAction}>
                  <Button size="sm" type="submit" variant="ghost">
                    {t("header.logout")}
                  </Button>
                </form>
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
          </div>
          <ThemeLanguageControls locale={locale} />
          <MobileMenu label={locale === "ru" ? "Открыть меню" : "Open menu"}>
            <div className="absolute right-0 top-14 grid w-64 gap-2 rounded-2xl border bg-card p-3 shadow-xl">
              {user ? (
                <>
                  <Button asChild variant="secondary">
                    <Link
                      href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                    >
                      {locale === "ru" ? "Мои заказы" : "Workspace"}
                    </Link>
                  </Button>
                  {user.role === "ADMIN" && (
                    <Button asChild variant="ghost">
                      <Link href="/admin/system-settings">
                        {t("admin.systemSettingsTab")}
                      </Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link href="/editor/new">{t("header.createLayout")}</Link>
                  </Button>
                  <form action={logoutAction}>
                    <Button className="w-full" type="submit" variant="ghost">
                      {t("header.logout")}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button asChild variant="secondary">
                    <Link href="/login">{t("header.login")}</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">{t("header.createAccount")}</Link>
                  </Button>
                </>
              )}
            </div>
          </MobileMenu>
        </nav>
      </div>
    </header>
  );
}
