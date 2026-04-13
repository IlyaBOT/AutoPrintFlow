import { cookies } from "next/headers";

import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

export type Locale = "en" | "ru";

const MESSAGES = {
  en,
  ru,
} as const;

const DEFAULT_LOCALE: Locale = "en";

export function getLocale(): Locale {
  const raw = cookies().get("apf_locale")?.value;
  if (raw === "ru" || raw === "en") {
    return raw;
  }
  return DEFAULT_LOCALE;
}

export function getTranslations(locale: Locale) {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}
