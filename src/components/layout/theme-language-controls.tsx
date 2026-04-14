"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { Locale, Theme } from "@/lib/i18n";
import { LOCALE_COOKIE_NAME, THEME_COOKIE_NAME } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { NerdIcon } from "@/components/ui/nerd-icon";

const languageOptions: Record<
  Locale,
  { code: string; flag: string; labelKey: string }
> = {
  en: {
    code: "US",
    flag: "🇺🇸",
    labelKey: "header.languageEnglish",
  },
  ru: {
    code: "RUS",
    flag: "🇷🇺",
    labelKey: "header.languageRussian",
  },
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function detectTheme(): Theme {
  const cookieTheme = getCookie(THEME_COOKIE_NAME);

  if (cookieTheme === "dark" || cookieTheme === "light") {
    return cookieTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeLanguageControls({
  locale,
}: {
  locale: Locale;
}) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasThemeOverride, setHasThemeOverride] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const themeCookie = getCookie(THEME_COOKIE_NAME);
    const override = themeCookie === "dark" || themeCookie === "light";
    const nextTheme = detectTheme();

    setHasThemeOverride(override);
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    if (hasThemeOverride) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [hasThemeOverride]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("click", handleClick);
    }

    return () => window.removeEventListener("click", handleClick);
  }, [menuOpen]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setHasThemeOverride(true);
    applyTheme(nextTheme);
    setCookie(THEME_COOKIE_NAME, nextTheme);
  }

  function setLanguage(next: Locale) {
    setCookie(LOCALE_COOKIE_NAME, next);
    setMenuOpen(false);
    window.location.reload();
  }

  const currentLanguage = languageOptions[locale] ?? languageOptions.en;

  return (
    <div className="relative z-[90] flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-800 shadow-soft transition-all duration-150",
          "hover:bg-white/90 active:scale-95 active:rotate-[-8deg] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900/80",
        )}
      >
        <NerdIcon className="text-base" name={theme === "dark" ? "moon" : "sun"} />
      </button>

      <div className="relative z-[100]" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-soft transition-all duration-150",
            "hover:bg-white/90 active:scale-95 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900/80",
          )}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="text-base leading-none">{currentLanguage.flag}</span>
          <span>{currentLanguage.code}</span>
          <NerdIcon className="text-[10px] text-slate-500 dark:text-slate-400" name="chevronDown" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-[120] mt-2 w-40 overflow-hidden rounded-2xl border border-white/60 bg-white/95 p-1 text-sm text-slate-700 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-100"
          >
            {(Object.keys(languageOptions) as Locale[]).map((key) => {
              const option = languageOptions[key];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLanguage(key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition",
                    "hover:bg-slate-100/80 dark:hover:bg-slate-800/70",
                  )}
                  role="menuitem"
                >
                  <span className="text-base leading-none">{option.flag}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.code}</span>
                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                    {t(option.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
