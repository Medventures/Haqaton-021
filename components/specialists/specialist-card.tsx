"use client";

import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Stars } from "@/components/badges";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice, type SpecialistCard } from "@/lib/specialists";

export function SpecialistCardView({ card }: { card: SpecialistCard }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/specialists/${card.id}`}
      className="group flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {card.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
          <BadgeCheck className="size-3.5" /> {t.specialists.verified}
        </span>
      </div>
      <div>
        <div className="font-semibold group-hover:text-primary">{card.name}</div>
        <div className="text-sm text-primary">{t.specialists.categories[card.category]}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {card.city}
        </span>
        <span>{t.specialists.experience(card.experienceYears)}</span>
      </div>
      <p className="line-clamp-3 text-sm text-foreground/80">{card.about}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm">
        {card.rating !== null ? (
          <span className="inline-flex items-center gap-1.5">
            <Stars value={card.rating} />
            <span className="text-xs text-muted-foreground">
              {card.rating.toFixed(1)} · {card.reviewsCount}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t.specialists.noReviews}</span>
        )}
        <span className="text-xs font-medium">
          {card.priceKzt ? t.specialists.price(formatPrice(card.priceKzt)) : t.specialists.priceOnRequest}
        </span>
      </div>
    </Link>
  );
}
