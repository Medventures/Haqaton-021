import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, GraduationCap, Languages, MapPin, MonitorSmartphone, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReviewStatusBadge, Stars } from "@/components/badges";
import { ReviewForm } from "@/components/specialists/review-form";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice, toSpecialistCard } from "@/lib/specialists";

export const dynamic = "force-dynamic";

export default async function SpecialistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const profile = await prisma.specialistProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, status: true } },
      reviews: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  const ownProfile = user?.role === "specialist" && profile?.userId === user.id;
  const staff = user?.role === "commission" || user?.role === "admin" || user?.role === "moderator";
  if (!profile || (profile.status !== "approved" && !ownProfile && !staff)) {
    notFound();
  }
  const card = toSpecialistCard(profile, locale);
  const approvedReviews = profile.reviews.filter((review) => review.status === "approved");
  const ownReview = user?.role === "parent" ? profile.reviews.find((review) => review.authorId === user.id) ?? null : null;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5">
        <Link href="/specialists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.specialists.backToCatalog}
        </Link>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {card.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold">{card.name}</h1>
                <div className="text-primary">{t.specialists.categories[card.category]}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {card.rating !== null ? (
                    <>
                      <Stars value={card.rating} size="md" />
                      <span className="font-medium">{card.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">{t.specialists.reviewsCount(card.reviewsCount)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t.specialists.noReviews}</span>
                  )}
                </div>
              </div>
              {profile.status === "approved" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                  <BadgeCheck className="size-4" /> {t.specialists.verified}
                </span>
              ) : (
                <ReviewStatusBadge status={profile.status} label={t.commission.statuses[profile.status as "pending" | "approved" | "rejected"] ?? profile.status} />
              )}
            </div>
            <div>
              <h2 className="font-semibold">{t.specialists.about}</h2>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground/85">{card.about}</p>
            </div>
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <GraduationCap className="size-4 text-primary" /> {t.specialists.education}
              </h2>
              <p className="mt-1 text-sm whitespace-pre-line text-foreground/85">{card.education}</p>
            </div>
          </section>

          <aside className="flex flex-col gap-3 self-start rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold">
              {card.priceKzt ? t.specialists.price(formatPrice(card.priceKzt)) : t.specialists.priceOnRequest}
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {card.city} · {t.specialists.experience(card.experienceYears)}
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-primary" />
              {card.formats.map((format) => t.specialists.formats[format]).join(", ")}
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Languages className="mt-0.5 size-4 shrink-0 text-primary" />
              {card.languages.map((language) => t.specialists.languages[language]).join(", ")}
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Phone className="size-4 text-primary" /> {t.specialists.contact}
              </div>
              {user ? card.contact : <Link href="/login" className="text-primary hover:underline">{t.specialists.contactHidden}</Link>}
            </div>
          </aside>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t.nav.reviews}</h2>
            {approvedReviews.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">{t.specialists.noReviews}</p>
            ) : (
              approvedReviews.map((review) => (
                <article key={review.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{review.author.name.split(" ")[0]}</span>
                    <Stars value={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</div>
                </article>
              ))
            )}
          </div>
          <div className="self-start rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">{ownReview ? t.specialists.yourReview : t.specialists.leaveReview}</h2>
            {user?.role === "parent" && profile.status === "approved" ? (
              <>
                {ownReview ? (
                  <div className="mb-3">
                    {ownReview.status === "pending" ? (
                      <ReviewStatusBadge status="pending" label={t.specialists.reviewPending} />
                    ) : ownReview.status === "rejected" ? (
                      <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{t.specialists.reviewRejected(ownReview.moderationNote ?? "")}</p>
                    ) : (
                      <ReviewStatusBadge status="approved" label={t.moderator.statuses.approved} />
                    )}
                  </div>
                ) : null}
                <ReviewForm specialistId={profile.id} initial={ownReview ? { rating: ownReview.rating, text: ownReview.text } : null} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.specialists.onlyParents}</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
