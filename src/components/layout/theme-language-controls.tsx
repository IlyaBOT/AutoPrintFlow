"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
type Locale = "en" | "ru";

const LANGUAGE_OPTIONS: Record<
  Locale,
  { code: string; label: string; flag: string; display: string }
> = {
  en: {
    code: "US",
    label: "English",
    flag: "🇺🇸",
    display: "US",
  },
  ru: {
    code: "RUS",
    label: "Русский",
    flag: "🇷🇺",
    display: "RUS",
  },
};

const SUN_ICON = "\uf185";
const MOON_ICON = "\uf186";
const CHEVRON_DOWN = "\uf0d7";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeLanguageControls({ locale }: { locale: Locale }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

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

  const currentLanguage = useMemo(() => LANGUAGE_OPTIONS[locale] ?? LANGUAGE_OPTIONS.en, [locale]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function setLanguage(next: Locale) {
    const nextLocale = next === "ru" ? "ru" : "en";
    document.cookie = `apf_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setMenuOpen(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-800 shadow-soft transition-all duration-150",
          "hover:bg-white/90 active:scale-95 active:rotate-[-8deg] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900/80",
        )}
      >
        <span className="nf-icon text-base">{theme === "dark" ? MOON_ICON : SUN_ICON}</span>
      </button>

      <div className="relative" ref={menuRef}>
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
          <span>{currentLanguage.display}</span>
          <span className="nf-icon text-[10px] text-slate-500 dark:text-slate-400">{CHEVRON_DOWN}</span>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-1 text-sm text-slate-700 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100"
          >
            {(Object.keys(LANGUAGE_OPTIONS) as Locale[]).map((key) => {
              const option = LANGUAGE_OPTIONS[key];
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
                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
