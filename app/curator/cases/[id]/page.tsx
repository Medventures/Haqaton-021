import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, TriangleAlert } from "lucide-react";
import { CaseStatusBadge } from "@/components/badges";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { CasePlanBoard } from "@/components/curator/case-plan-board";
import { GeneratePlanButton } from "@/components/curator/generate-plan-button";
import { FileManager } from "@/components/files/file-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requirePageUser } from "@/lib/auth";
import { getCase } from "@/lib/cases";
import { formatAge, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { runEscalations } from "@/lib/escalation";
import { getI18n } from "@/lib/i18n/server";
import { loadQuestionDefs } from "@/lib/interview/questions";
import { describeAnswer } from "@/lib/interview/slots";
import { STATUS_STYLE } from "@/lib/labels";
import { historyNote, stepTitle } from "@/lib/plan/view";
import { today } from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function CuratorCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser("curator");
  await runEscalations();
  const { locale, t } = await getI18n();
  const record = await getCase(id);
  if (!record || record.curatorId !== user.id) {
    notFound();
  }
  const [currentDay, events, defs] = await Promise.all([
    today(),
    prisma.escalationEvent.findMany({ where: { caseId: id, resolvedAt: null } }),
    loadQuestionDefs(),
  ]);
  const defsById = new Map(defs.map((def) => [def.id, def]));
  const plan = record.plan;
  const answered = record.interview.filter((turn) => turn.answer);
  const history = plan
    ? [
        ...plan.steps.flatMap((step) =>
          step.history.map((entry) => ({
            at: entry.at,
            by: entry.by,
            status: entry.status as keyof typeof STATUS_STYLE | null,
            note: historyNote(entry, locale),
            raw: entry.note,
            stepTitle: stepTitle(step, locale) as string | null,
          })),
        ),
        {
          at: plan.generatedAt,
          by: "system" as const,
          status: null,
          note: plan.generatedBy === "ai" ? t.curator.planGeneratedAi : t.curator.planGeneratedRules,
          raw: null,
          stepTitle: null,
        },
        ...(plan.approvedAt
          ? [{ at: plan.approvedAt, by: "curator" as const, status: null, note: t.curator.planApprovedBy(plan.approvedBy ?? ""), raw: null, stepTitle: null }]
          : []),
      ]
        .filter((entry) => !(entry.by === "system" && entry.raw === "Шаг добавлен в план"))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 80)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/curator" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t.curator.allFamilies}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {record.childName}
            {record.facts.child_age_months !== undefined ? (
              <span className="ml-2 text-base font-normal text-muted-foreground">{formatAge(record.facts.child_age_months, locale)}</span>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.curator.parentLine(record.parentName)}
            {record.facts.city ? ` · ${record.facts.city}` : ""}
          </p>
        </div>
        <CaseStatusBadge status={record.status} />
      </div>

      <Tabs defaultValue="plan" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 sm:w-fit">
          <TabsTrigger value="plan">{t.curator.tabs.plan}</TabsTrigger>
          <TabsTrigger value="answers">{t.curator.tabs.answers}</TabsTrigger>
          <TabsTrigger value="documents">{t.curator.tabs.documents}</TabsTrigger>
          <TabsTrigger value="calendar">{t.curator.tabs.calendar}</TabsTrigger>
          <TabsTrigger value="history">{t.curator.tabs.history}</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          {plan ? (
            <CasePlanBoard
              caseId={record.id}
              plan={plan}
              today={currentDay}
              escalations={events.map((event) => ({ stepId: event.stepId, level: event.level, createdAt: event.createdAt.toISOString() }))}
            />
          ) : record.status === "plan_draft" ? (
            <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
              <p className="mb-4 text-muted-foreground">{t.plan.notGenerated}</p>
              <GeneratePlanButton caseId={record.id} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-muted-foreground">{t.plan.waitInterview}</div>
          )}
        </TabsContent>

        <TabsContent value="answers">
          <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
            {answered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.curator.noInterview}</p>
            ) : (
              <ol className="grid gap-3 md:grid-cols-2">
                {answered.map((turn, index) => {
                  const redFlag = turn.alert || (turn.slot === "red_flags" && (turn.extracted?.red_flags ?? []).some((flag) => flag !== "none"));
                  const extracted = turn.extracted ?? {};
                  const recognized = [
                    ...Object.entries(extracted)
                      .filter(([key]) => key !== "extra")
                      .map(([key, value]) => describeAnswer(defsById.get(key), key, value, locale)),
                    ...Object.entries(extracted.extra ?? {}).map(([key, value]) => describeAnswer(defsById.get(key), key, value, locale)),
                  ];
                  return (
                    <li key={`${turn.slot}-${index}`} className={cn("rounded-lg border p-3 text-sm", redFlag && "border-red-300 bg-red-50")}>
                      <div className="text-xs text-muted-foreground">{turn.question}</div>
                      <div className={cn("mt-1 font-medium", redFlag && "text-red-700")}>
                        {redFlag ? <TriangleAlert className="mr-1 inline size-4" /> : null}
                        {turn.answer?.text}
                      </div>
                      {recognized.length > 0 && turn.answer?.values === null ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t.curator.recognized}: {recognized.join("; ")}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
            {record.status === "interview" ? <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{t.curator.interviewOngoing}</p> : null}
          </section>
        </TabsContent>

        <TabsContent value="documents">
          <FileManager mode="case" caseId={record.id} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarBoard mode="curator" fixedCaseId={record.id} />
        </TabsContent>

        <TabsContent value="history">
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold">
              <History className="size-4 text-primary" /> {t.curator.historyTitle}
            </h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ol className="mt-3 flex flex-col divide-y">
                {history.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="w-36 shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
                    <span className="w-20 shrink-0 text-xs font-medium">{t.historyActors[entry.by]}</span>
                    <span className="min-w-0 flex-1">
                      {entry.stepTitle ? <span className="font-medium">{entry.stepTitle}: </span> : null}
                      {entry.note}
                      {entry.status && entry.stepTitle ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({STATUS_STYLE[entry.status].emoji} {t.statuses[entry.status].toLowerCase()})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
