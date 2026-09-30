import Link from "next/link";
import { redirect } from "next/navigation";
import { BookHeart, Hourglass, MessageCircleHeart } from "lucide-react";
import { ParentRoute } from "@/components/parent/parent-route";
import { PlanGenerating } from "@/components/parent/plan-generating";
import { SpecialistCardView } from "@/components/specialists/specialist-card";
import { requirePageUser } from "@/lib/auth";
import { getCaseForParent } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { runEscalations } from "@/lib/escalation";
import { getI18n } from "@/lib/i18n/server";
import { canParentSeePlan } from "@/lib/plan/mutations";
import { toSpecialistCard } from "@/lib/specialists";
import { getActiveSubscription } from "@/lib/subscription";
import { today } from "@/lib/time";

export default async function ParentPage() {
  const user = await requirePageUser("parent");
  const [{ locale, t }] = await Promise.all([getI18n(), runEscalations(), getActiveSubscription(user.id)]);
  const [record, profiles] = await Promise.all([
    getCaseForParent(user.id),
    prisma.specialistProfile.findMany({
      where: { status: "approved", user: { status: "active" } },
      include: { user: { select: { name: true } }, reviews: { select: { rating: true, status: true } } },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
  ]);
  if (!record) {
    redirect("/api/auth/logout");
  }

  let content: React.ReactNode;
  if (record.status === "interview") {
    const started = record.interview.some((turn) => turn.answer);
    content = (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <MessageCircleHeart className="size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">{t.interview.startTitle(user.name.split(" ")[0])}</h1>
        <p className="mt-2 text-muted-foreground">{t.interview.startText(record.childName)}</p>
        <Link
          href="/parent/interview"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex sm:w-auto"
        >
          {started ? t.interview.continue : t.interview.start}
        </Link>
      </section>
    );
  } else if (record.status === "plan_draft" && !record.plan) {
    content = (
      <div className="mx-auto w-full max-w-3xl">
        <PlanGenerating caseId={record.id} />
      </div>
    );
  } else if (!record.plan || !canParentSeePlan(record)) {
    content = (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 text-center shadow-sm">
        <Hourglass className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-xl font-semibold">{t.plan.underReviewTitle(record.curatorName ?? "")}</h1>
        <p className="mt-2 text-muted-foreground">{t.plan.underReviewText}</p>
      </section>
    );
  } else {
    content = (
      <ParentRoute
        caseId={record.id}
        childName={record.childName}
        curatorName={record.curatorName}
        plan={record.plan}
        today={await today()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {content}
      <Link href="/parent/journal" className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:border-primary">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookHeart className="size-6" /></span>
        <span><span className="block font-semibold">{t.journal.title}</span><span className="mt-0.5 block text-sm text-muted-foreground">{t.journal.subtitle}</span></span>
      </Link>
      <section aria-labelledby="parent-specialists-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="parent-specialists-title" className="text-xl font-semibold">{t.landing.specialistsPreview}</h2>
          <Link href="/specialists" className="text-sm font-medium text-primary hover:underline">
            {t.landing.allSpecialists}
          </Link>
        </div>
        {profiles.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {profiles.map((profile) => (
              <SpecialistCardView key={profile.id} card={toSpecialistCard(profile, locale)} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
