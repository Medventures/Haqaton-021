import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReviewStatusBadge, Stars } from "@/components/badges";
import { DecisionForm } from "@/components/staff/decision-form";
import { requirePageUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePageUser("moderator");
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const filter = FILTERS.includes(params.status as (typeof FILTERS)[number]) ? (params.status as (typeof FILTERS)[number]) : "pending";
  const [reviews, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where: filter === "all" ? {} : { status: filter },
      include: {
        author: { select: { name: true, email: true } },
        specialist: { select: { id: true, user: { select: { name: true } } } },
        moderator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where: { status: "pending" } }),
  ]);
  const labels = {
    approve: t.moderator.approve,
    reject: t.moderator.reject,
    note: t.moderator.note,
    approved: t.moderator.approved,
    rejected: t.moderator.rejected,
  };

  return (
    <AppShell user={user} badges={{ pending: pendingCount }}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold">{t.moderator.title}</h1>
          <p className="text-sm text-muted-foreground">{t.moderator.subtitle}</p>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          {t.moderator.rules}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Link
              key={item}
              href={`/moderator?status=${item}`}
              className={cn(
                "inline-flex h-9 items-center rounded-full border bg-white px-4 text-sm font-medium hover:bg-muted",
                filter === item && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {t.moderator.filters[item]}
              {item === "pending" && pendingCount > 0 ? ` · ${pendingCount}` : ""}
            </Link>
          ))}
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center text-muted-foreground">{t.common.empty}</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/specialists/${review.specialist.id}`} className="font-semibold hover:text-primary">
                    {t.moderator.about(review.specialist.user.name)}
                  </Link>
                  <ReviewStatusBadge
                    status={review.status}
                    label={t.moderator.statuses[review.status as "pending" | "approved" | "rejected"] ?? review.status}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Stars value={review.rating} />
                  <span>{t.moderator.author(`${review.author.name} (${review.author.email})`)}</span>
                  <span>{formatDateTime(review.createdAt)}</span>
                </div>
                <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{review.text}</p>
                {review.moderationNote ? (
                  <p className="text-xs text-muted-foreground">
                    {t.moderator.note}: {review.moderationNote}
                    {review.moderator ? ` · ${review.moderator.name}` : ""}
                  </p>
                ) : null}
                {review.status !== "rejected" ? (
                  <DecisionForm
                    endpoint={`/api/moderation/reviews/${review.id}`}
                    labels={review.status === "approved" ? { ...labels, reject: t.moderator.hide } : labels}
                    compact
                  />
                ) : (
                  <DecisionForm endpoint={`/api/moderation/reviews/${review.id}`} labels={labels} compact />
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
