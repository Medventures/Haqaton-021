import { kk } from "@/lib/i18n/kk";
import type { Locale } from "@/lib/i18n/locale";
import { ru, type Dictionary } from "@/lib/i18n/ru";

export const dictionaries: Record<Locale, Dictionary> = { ru, kk };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
export type ErrorKey = keyof Dictionary["errors"];
