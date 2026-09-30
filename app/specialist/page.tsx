import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ExternalLink, Hourglass, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Stars } from "@/components/badges";
import { FileManager } from "@/components/files/file-manager";
import { ProfileEditor } from "@/components/specialists/profile-editor";
import { requirePageUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { toSpecialistCard } from "@/lib/specialists";

export const dynamic = "force-dynamic";

export default async function SpecialistCabinetPage() {
  const user = await requirePageUser("specialist");
  const { locale, t } = await getI18n();
  const profile = await prisma.specialistProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { name: true } }, reviews: { where: { status: "approved" }, orderBy: { createdAt: "desc" } } },
  });
  if (!profile) {
    redirect("/api/auth/logout");
  }
  const card = toSpecialistCard(profile, locale);
  const status =
    profile.status === "approved"
      ? { icon: BadgeCheck, tone: "border-emerald-200 bg-emerald-50 text-emerald-800", title: t.specialistCabinet.statusApproved, text: null }
      : profile.status === "rejected"
        ? { icon: XCircle, tone: "border-red-200 bg-red-50 text-red-800", title: t.specialistCabinet.statusRejected, text: t.specialistCabinet.resubmitHint }
        : { icon: Hourglass, tone: "border-amber-200 bg-amber-50 text-amber-800", title: t.specialistCabinet.statusPending, text: t.specialistCabinet.statusPendingText };

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t.specialistCabinet.title}</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} · {t.specialists.categories[card.category]}
            </p>
          </div>
          <Link href={`/specialists/${profile.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ExternalLink className="size-4" /> {t.specialistCabinet.publicProfile}
          </Link>
        </div>
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${status.tone}`}>
          <status.icon className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">{status.title}</div>
            {status.text ? <p className="mt-1">{status.text}</p> : null}
            {profile.commissionNote ? <p className="mt-1 font-medium">{t.specialistCabinet.commissionNote(profile.commissionNote)}</p> : null}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">{t.specialistCabinet.editTitle}</h2>
            <ProfileEditor
              initial={{
                category: card.category,
                city: card.city,
                experienceYears: String(card.experienceYears),
                aboutRu: card.aboutRu,
                aboutKk: card.aboutKk,
                education: card.education,
                priceKzt: card.priceKzt === null ? "" : String(card.priceKzt),
                formats: card.formats,
                languages: card.languages,
                contact: card.contact,
              }}
            />
          </section>
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-semibold">{t.specialistCabinet.credentials}</h2>
                <p className="text-xs text-muted-foreground">{t.specialistCabinet.credentialsHint}</p>
              </div>
              <FileManager mode="specialist" />
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">{t.specialistCabinet.myReviews}</h2>
              {profile.reviews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.specialists.noReviews}</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {profile.reviews.map((review) => (
                    <li key={review.id} className="rounded-xl border p-3 text-sm">
                      <Stars value={review.rating} />
                      <p className="mt-1">{review.text}</p>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
