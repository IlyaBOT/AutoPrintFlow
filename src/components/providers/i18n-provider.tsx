"use client";

import { createContext, useContext } from "react";

import type { Locale, Messages } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string, values?: Record<string, string | number | null | undefined>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <I18nContext.Provider
      value={{
        locale,
        messages,
        t: (key, values) => translate(messages, key, values),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
