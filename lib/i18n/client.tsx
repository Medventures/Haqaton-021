"use client";

import { createContext, useContext } from "react";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useI18n(): { locale: Locale; t: Dictionary } {
  const locale = useLocale();
  return { locale, t: getDictionary(locale) };
}
