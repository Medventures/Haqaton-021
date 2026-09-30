import type { Review, SpecialistProfile, User } from "@prisma/client";
import { z } from "zod";
import type { Locale } from "@/lib/i18n/locale";

export const SPECIALIST_CATEGORIES = [
  "nanny",
  "trainer",
  "nutritionist",
  "pediatrician",
  "child_psychiatrist",
  "neurologist",
  "speech_therapist",
  "defectologist",
  "psychologist",
  "aba_therapist",
  "occupational_therapist",
  "massage_therapist",
  "other",
] as const;

export const SPECIALIST_FORMATS = ["online", "offline", "home"] as const;
export const SPECIALIST_LANGUAGES = ["ru", "kk", "en"] as const;

export type SpecialistCategory = (typeof SPECIALIST_CATEGORIES)[number];

export const specialistProfileSchema = z.object({
  category: z.enum(SPECIALIST_CATEGORIES),
  city: z.string().trim().min(2).max(60),
  experienceYears: z.number().int().min(0).max(60),
  aboutRu: z.string().trim().min(20).max(2000),
  aboutKk: z.string().trim().min(20).max(2000),
  education: z.string().trim().min(5).max(2000),
  priceKzt: z.number().int().min(0).max(1_000_000).nullable(),
  formats: z.array(z.enum(SPECIALIST_FORMATS)).min(1),
  languages: z.array(z.enum(SPECIALIST_LANGUAGES)).min(1),
  contact: z.string().trim().min(5).max(200),
});

export type SpecialistProfileInput = z.infer<typeof specialistProfileSchema>;

function parseList<T extends string>(raw: string, allowed: readonly T[]): T[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is T => allowed.includes(item)) : [];
  } catch {
    return [];
  }
}

export type SpecialistCard = {
  id: string;
  name: string;
  category: SpecialistCategory;
  city: string;
  experienceYears: number;
  about: string;
  aboutRu: string;
  aboutKk: string;
  education: string;
  priceKzt: number | null;
  formats: (typeof SPECIALIST_FORMATS)[number][];
  languages: (typeof SPECIALIST_LANGUAGES)[number][];
  contact: string;
  status: string;
  commissionNote: string | null;
  rating: number | null;
  reviewsCount: number;
  createdAt: string;
};

export function toSpecialistCard(
  profile: SpecialistProfile & { user: Pick<User, "name">; reviews?: Pick<Review, "rating" | "status">[] },
  locale: Locale,
): SpecialistCard {
  const approved = (profile.reviews ?? []).filter((review) => review.status === "approved");
  const rating = approved.length > 0 ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : null;
  return {
    id: profile.id,
    name: profile.user.name,
    category: (SPECIALIST_CATEGORIES as readonly string[]).includes(profile.category) ? (profile.category as SpecialistCategory) : "other",
    city: profile.city,
    experienceYears: profile.experienceYears,
    about: locale === "kk" ? profile.aboutKk || profile.aboutRu : profile.aboutRu || profile.aboutKk,
    aboutRu: profile.aboutRu,
    aboutKk: profile.aboutKk,
    education: profile.education,
    priceKzt: profile.priceKzt,
    formats: parseList(profile.formats, SPECIALIST_FORMATS),
    languages: parseList(profile.languages, SPECIALIST_LANGUAGES),
    contact: profile.contact,
    status: profile.status,
    commissionNote: profile.commissionNote,
    rating: rating === null ? null : Math.round(rating * 10) / 10,
    reviewsCount: approved.length,
    createdAt: profile.createdAt.toISOString(),
  };
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}
