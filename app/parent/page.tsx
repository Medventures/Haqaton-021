import Link from "next/link";
import { redirect } from "next/navigation";
import { Hourglass, MessageCircleHeart } from "lucide-react";
import { ParentRoute } from "@/components/parent/parent-route";
import { PlanGenerating } from "@/components/parent/plan-generating";
import { requirePageUser } from "@/lib/auth";
import { getCaseForParent } from "@/lib/cases";
import { runEscalations } from "@/lib/escalation";
import { getI18n } from "@/lib/i18n/server";
import { canParentSeePlan } from "@/lib/plan/mutations";
import { getActiveSubscription } from "@/lib/subscription";
import { today } from "@/lib/time";

export default async function ParentPage() {
  const user = await requirePageUser("parent");
  const [{ t }] = await Promise.all([getI18n(), runEscalations(), getActiveSubscription(user.id)]);
  const record = await getCaseForParent(user.id);
  if (!record) {
    redirect("/api/auth/logout");
  }

  if (record.status === "interview") {
    const started = record.interview.some((turn) => turn.answer);
    return (
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <MessageCircleHeart className="size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">{t.interview.startTitle(user.name.split(" ")[0])}</h1>
        <p className="mt-2 text-muted-foreground">{t.interview.startText(record.childName)}</p>
        <Link
          href="/parent/interview"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
        >
          {started ? t.interview.continue : t.interview.start}
        </Link>
      </section>
    );
  }

  if (record.status === "plan_draft" && !record.plan) {
    return <PlanGenerating caseId={record.id} />;
  }

  if (!record.plan || !canParentSeePlan(record)) {
    return (
      <section className="rounded-2xl border bg-white p-6 text-center shadow-sm">
        <Hourglass className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-xl font-semibold">{t.plan.underReviewTitle(record.curatorName ?? "")}</h1>
        <p className="mt-2 text-muted-foreground">{t.plan.underReviewText}</p>
      </section>
    );
  }

  return (
    <ParentRoute
      caseId={record.id}
      childName={record.childName}
      curatorName={record.curatorName}
      plan={record.plan}
      today={await today()}
    />
  );
}
