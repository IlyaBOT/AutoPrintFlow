import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

export const LOCALE_COOKIE_NAME = "apf_locale";
export const THEME_COOKIE_NAME = "apf_theme";

export type Locale = "en" | "ru";
export type Theme = "light" | "dark";

export const MESSAGES = {
  en,
  ru,
} as const;

export type Messages = (typeof MESSAGES)[Locale];

const DEFAULT_LOCALE: Locale = "en";

function normalizeLocale(value?: string | null): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return null;
}

function pickLocaleFromAcceptLanguage(value?: string | null): Locale | null {
  if (!value) {
    return null;
  }

  for (const part of value.split(",")) {
    const locale = normalizeLocale(part.split(";")[0]?.trim());

    if (locale) {
      return locale;
    }
  }

  return null;
}

export function resolveLocale(cookieLocale?: string | null, acceptLanguage?: string | null): Locale {
  return normalizeLocale(cookieLocale) ?? pickLocaleFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

export function resolveTheme(cookieTheme?: string | null): Theme | null {
  return cookieTheme === "dark" || cookieTheme === "light" ? cookieTheme : null;
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}

function interpolate(template: string, values?: Record<string, string | number | null | undefined>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function translate(
  messages: Messages,
  key: string,
  values?: Record<string, string | number | null | undefined>,
) {
  const result = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[part];
    }

    return null;
  }, messages);

  if (typeof result !== "string") {
    return key;
  }

  return interpolate(result, values);
}
