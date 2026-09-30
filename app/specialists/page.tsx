import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SpecialistCardView } from "@/components/specialists/specialist-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { SPECIALIST_CATEGORIES, toSpecialistCard } from "@/lib/specialists";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>;
}) {
  const [{ locale, t }, user, params] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  const category = SPECIALIST_CATEGORIES.includes(params.category as (typeof SPECIALIST_CATEGORIES)[number]) ? params.category : undefined;
  const profiles = await prisma.specialistProfile.findMany({
    where: { status: "approved", user: { status: "active" } },
    include: { user: { select: { name: true } }, reviews: { select: { rating: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  const cities = [...new Set(profiles.map((profile) => profile.city))].sort((a, b) => a.localeCompare(b, "ru"));
  const query = params.q?.trim().toLowerCase() ?? "";
  const cards = profiles
    .map((profile) => toSpecialistCard(profile, locale))
    .filter((card) => !category || card.category === category)
    .filter((card) => !params.city || card.city === params.city)
    .filter(
      (card) =>
        !query ||
        [card.name, card.aboutRu, card.aboutKk, card.education, t.specialists.categories[card.category]].some((value) =>
          value.toLowerCase().includes(query),
        ),
    )
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewsCount - a.reviewsCount);

  const link = (next: { category?: string; city?: string }) => {
    const search = new URLSearchParams();
    const merged = { category, city: params.city, q: params.q, ...next };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });
    const text = search.toString();
    return text ? `/specialists?${text}` : "/specialists";
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold">{t.specialists.title}</h1>
          <p className="text-sm text-muted-foreground">{t.specialists.subtitle}</p>
        </div>
        <form className="flex flex-wrap gap-2" action="/specialists">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {params.city ? <input type="hidden" name="city" value={params.city} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={t.specialists.searchPlaceholder}
              className="h-10 w-full rounded-lg border bg-white pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
            />
          </div>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t.common.search}
          </button>
        </form>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link
            href={link({ category: undefined })}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border bg-white px-3 text-sm whitespace-nowrap hover:bg-muted",
              !category && "border-primary bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            {t.specialists.allCategories}
          </Link>
          {SPECIALIST_CATEGORIES.filter((item) => profiles.some((profile) => profile.category === item)).map((item) => (
            <Link
              key={item}
              href={link({ category: item })}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border bg-white px-3 text-sm whitespace-nowrap hover:bg-muted",
                category === item && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {t.specialists.categories[item]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={link({ city: undefined })} className={cn("rounded-md px-2 py-1 hover:bg-muted", !params.city && "font-semibold text-primary")}>
            {t.specialists.allCities}
          </Link>
          {cities.map((city) => (
            <Link key={city} href={link({ city })} className={cn("rounded-md px-2 py-1 hover:bg-muted", params.city === city && "font-semibold text-primary")}>
              {city}
            </Link>
          ))}
        </div>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center text-muted-foreground">{t.specialists.notFound}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
              <SpecialistCardView key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
