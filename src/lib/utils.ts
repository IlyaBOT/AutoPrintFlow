import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Locale } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  locale: Locale,
  value: Date | string | null | undefined,
  fallback = "Not available",
) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function pluralize(locale: Locale, count: number, forms: { one: string; few: string; many: string }) {
  if (locale === "ru") {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return forms.one;
    }

    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return forms.few;
    }

    return forms.many;
  }

  return count === 1 ? forms.one : forms.many;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
