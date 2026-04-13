import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { getLocale, getTranslations } from "@/lib/i18n";
import { ThemeLanguageControls } from "@/components/layout/theme-language-controls";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const locale = getLocale();
  const t = getTranslations(locale);

  return (
    <header className="page-shell pb-0">
      <div className="glass-panel flex items-center justify-between rounded-[32px] px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-slate-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
            <span className="nf-icon text-lg">{"\uf005"}</span>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/75">
              AutoPrintFlow
            </div>
            <div className="text-sm text-slate-600">{t.tagline}</div>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:block"
              >
                {user.role === "ADMIN" ? t.admin : t.dashboard}
              </Link>
              <Button asChild size="sm" variant="secondary">
                <Link href="/editor/new">{t.createLayout}</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/logout" prefetch={false}>
                  {t.logout}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">{t.login}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t.createAccount}</Link>
              </Button>
            </>
          )}
          <ThemeLanguageControls locale={locale} />
        </nav>
      </div>
    </header>
  );
}
