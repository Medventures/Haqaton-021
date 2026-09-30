import { intlLocale, type Locale } from "@/lib/i18n/locale";

export const APP_TIME_ZONE = "Asia/Almaty";

const DAY_MS = 86_400_000;

const dateOnlyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function toDateOnly(date: Date): string {
  return dateOnlyFormatter.format(date);
}

export function toTimeOnly(date: Date): string {
  return timeFormatter.format(date);
}

export function parseDateOnly(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function fromLocalDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00+05:00`);
}

export function addDays(value: string, days: number): string {
  return new Date(parseDateOnly(value) + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string): number {
  return Math.round((parseDateOnly(later) - parseDateOnly(earlier)) / DAY_MS);
}

export function dateAtMorning(value: string): Date {
  return new Date(`${value}T04:00:00.000Z`);
}

const KK_MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
const KK_WEEKDAYS = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"];

function cleanYear(text: string): string {
  return text.replace(/\s?(г\.|ж\.)$/u, "").trim();
}

function dateParts(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function formatDate(value: string, locale: Locale = "ru"): string {
  if (locale === "kk") {
    const { year, month, day } = dateParts(value);
    return `${day} ${KK_MONTHS[month]} ${year}`;
  }
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  return cleanYear(formatter.format(new Date(parseDateOnly(value))));
}

export function formatDayMonth(value: string, locale: Locale = "ru"): string {
  if (locale === "kk") {
    const { month, day } = dateParts(value);
    return `${day} ${KK_MONTHS[month]}`;
  }
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "long" });
  return formatter.format(new Date(parseDateOnly(value)));
}

export function formatMonthYear(year: number, month: number, locale: Locale = "ru"): string {
  if (locale === "kk") {
    const name = KK_MONTHS[month];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
  }
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", month: "long", year: "numeric" });
  const text = cleanYear(formatter.format(new Date(Date.UTC(year, month, 1))));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function weekdayShortNames(locale: Locale = "ru"): string[] {
  if (locale === "kk") {
    return KK_WEEKDAYS;
  }
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 1 + index))));
}

export function formatDateShort(value: string): string {
  return shortDateFormatter.format(new Date(parseDateOnly(value)));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms[1];
  }
  return forms[2];
}

export function formatDays(count: number, locale: Locale = "ru"): string {
  if (locale === "kk") {
    return `${count} күн`;
  }
  return `${count} ${plural(count, ["день", "дня", "дней"])}`;
}

export function formatAge(months: number | undefined | null, locale: Locale = "ru"): string | null {
  if (months === undefined || months === null) {
    return null;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (locale === "kk") {
    if (years > 0) {
      parts.push(`${years} жас`);
    }
    if (rest > 0 || years === 0) {
      parts.push(`${rest} ай`);
    }
    return parts.join(" ");
  }
  if (years > 0) {
    parts.push(`${years} ${plural(years, ["год", "года", "лет"])}`);
  }
  if (rest > 0 || years === 0) {
    parts.push(`${rest} ${plural(rest, ["месяц", "месяца", "месяцев"])}`);
  }
  return parts.join(" ");
}
