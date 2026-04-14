import { cookies, headers } from "next/headers";

import {
  getMessages,
  LOCALE_COOKIE_NAME,
  resolveLocale,
  resolveTheme,
  THEME_COOKIE_NAME,
  translate,
} from "@/lib/i18n";

export async function getLocale() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    headerStore.get("accept-language"),
  );
}

export async function getThemeOverride() {
  const cookieStore = await cookies();
  return resolveTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);
}

export async function getTranslator() {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return {
    locale,
    messages,
    t: (key: string, values?: Record<string, string | number | null | undefined>) =>
      translate(messages, key, values),
  };
}
