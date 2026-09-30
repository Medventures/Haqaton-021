import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReviewStatusBadge } from "@/components/badges";
import { FileManager } from "@/components/files/file-manager";
import { DecisionForm } from "@/components/staff/decision-form";
import { requirePageUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice, toSpecialistCard } from "@/lib/specialists";

export const dynamic = "force-dynamic";

export default async function CommissionApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser("commission");
  const { locale, t } = await getI18n();
  const profile = await prisma.specialistProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  if (!profile) {
    notFound();
  }
  const reviewer = profile.reviewedById ? await prisma.user.findUnique({ where: { id: profile.reviewedById }, select: { name: true } }) : null;
  const pendingCount = await prisma.specialistProfile.count({ where: { status: "pending" } });
  const card = toSpecialistCard(profile, locale);
  const rows: [string, string][] = [
    [t.specialistCabinet.category, t.specialists.categories[card.category]],
    [t.specialistCabinet.city, card.city],
    [t.specialistCabinet.experienceYears, String(card.experienceYears)],
    [t.specialistCabinet.price, card.priceKzt ? formatPrice(card.priceKzt) : t.specialists.priceOnRequest],
    [t.specialistCabinet.formats, card.formats.map((format) => t.specialists.formats[format]).join(", ")],
    [t.specialistCabinet.languages, card.languages.map((language) => t.specialists.languages[language]).join(", ")],
    [t.specialistCabinet.contact, card.contact],
    [t.auth.email, profile.user.email],
    [t.commission.submitted, formatDateTime(profile.updatedAt)],
  ];

  return (
    <AppShell user={user} badges={{ pending: pendingCount }}>
      <div className="flex flex-col gap-5">
        <Link href="/commission" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.commission.back}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{profile.user.name}</h1>
          <ReviewStatusBadge status={profile.status} label={t.commission.statuses[profile.status as "pending" | "approved" | "rejected"] ?? profile.status} />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h2 className="font-semibold">{t.specialistCabinet.aboutRu}</h2>
              <p className="mt-1 text-sm whitespace-pre-line">{profile.aboutRu}</p>
            </div>
            <div>
              <h2 className="font-semibold">{t.specialistCabinet.aboutKk}</h2>
              <p className="mt-1 text-sm whitespace-pre-line">{profile.aboutKk}</p>
            </div>
            <div>
              <h2 className="font-semibold">{t.specialistCabinet.education}</h2>
              <p className="mt-1 text-sm whitespace-pre-line">{profile.education}</p>
            </div>
          </section>
          <div className="flex flex-col gap-5">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold">{t.commission.decision}</h2>
              {profile.reviewedAt && reviewer ? (
                <p className="mb-2 text-xs text-muted-foreground">{t.commission.reviewedBy(reviewer.name, formatDateTime(profile.reviewedAt))}</p>
              ) : null}
              {profile.commissionNote ? <p className="mb-3 rounded-lg bg-muted p-2 text-sm">{profile.commissionNote}</p> : null}
              <DecisionForm
                endpoint={`/api/commission/${profile.id}`}
                labels={{
                  approve: t.commission.approve,
                  reject: t.commission.reject,
                  note: t.commission.note,
                  notePlaceholder: t.commission.notePlaceholder,
                  approved: t.commission.approved,
                  rejected: t.commission.rejected,
                }}
              />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">{t.specialistCabinet.credentials}</h2>
              <FileManager mode="review" specialistId={profile.id} />
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
