export const LOCALES = ["ru", "kk"] as const;

export type Locale = (typeof LOCALES)[number];

export type Localized = { ru: string; kk: string };

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_COOKIE = "aqyl_lang";

export function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "kk";
}

export function intlLocale(locale: Locale): string {
  return locale === "kk" ? "kk-KZ" : "ru-RU";
}

export function pick<T>(locale: Locale, ru: T, kk: T): T {
  return locale === "kk" ? kk : ru;
}

export function L(ru: string, kk: string): Localized {
  return { ru, kk };
}

export function localized(value: Localized, locale: Locale): string {
  return value[locale] || value.ru;
}
