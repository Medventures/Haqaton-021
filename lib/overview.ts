import { parseCaseRow, type CaseRecord } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { runEscalations } from "@/lib/escalation";
import { overdueSteps, planProgress } from "@/lib/plan/overdue";
import type { PlanStep } from "@/lib/plan/schema";
import { today } from "@/lib/time";

export type CaseSummary = {
  record: CaseRecord;
  progress: { done: number; total: number };
  overdueCount: number;
  maxLevel: 0 | 1 | 2;
  subscriptionEndsAt: string | null;
};

export type OverdueRow = {
  caseId: string;
  childName: string;
  parentName: string;
  step: PlanStep;
  days: number;
  level: 1 | 2;
  openEscalation: { level: number; createdAt: string } | null;
  level2Since: string | null;
  resolvedNote: string | null;
};

export async function loadCuratorOverview(curatorId: string) {
  await runEscalations();
  const [rows, currentDay] = await Promise.all([
    prisma.case.findMany({ where: { curatorId }, include: { parent: true, curator: true }, orderBy: { updatedAt: "desc" } }),
    today(),
  ]);
  const cases = rows.map(parseCaseRow);
  const caseIds = cases.map((record) => record.id);
  const [events, subscriptions] = await Promise.all([
    prisma.escalationEvent.findMany({ where: { caseId: { in: caseIds } }, orderBy: { createdAt: "asc" } }),
    prisma.subscription.findMany({ where: { userId: { in: cases.map((record) => record.parentId) }, status: "active" } }),
  ]);
  const summaries: CaseSummary[] = cases.map((record) => {
    const overdue = overdueSteps(record.plan, currentDay);
    const subscription = subscriptions.find((item) => item.userId === record.parentId);
    return {
      record,
      progress: planProgress(record.plan),
      overdueCount: overdue.length,
      maxLevel: overdue.reduce<0 | 1 | 2>((max, item) => (item.level > max ? item.level : max), 0),
      subscriptionEndsAt: subscription ? subscription.endsAt.toISOString() : null,
    };
  });
  const overdueRows: OverdueRow[] = cases
    .flatMap((record) =>
      overdueSteps(record.plan, currentDay).map((item) => {
        const stepEvents = events.filter((event) => event.caseId === record.id && event.stepId === item.step.id);
        const open = stepEvents.filter((event) => !event.resolvedAt).sort((a, b) => b.level - a.level)[0] ?? null;
        const level2 = stepEvents.filter((event) => event.level === 2).at(-1) ?? null;
        const resolved = stepEvents.filter((event) => event.resolvedAt).at(-1) ?? null;
        return {
          caseId: record.id,
          childName: record.childName,
          parentName: record.parentName,
          step: item.step,
          days: item.days,
          level: item.level as 1 | 2,
          openEscalation: open ? { level: open.level, createdAt: open.createdAt.toISOString() } : null,
          level2Since: level2 ? level2.createdAt.toISOString() : null,
          resolvedNote: !open && resolved ? resolved.note : null,
        };
      }),
    )
    .sort((a, b) => b.days - a.days);
  return {
    today: currentDay,
    summaries,
    overdueRows,
    counts: {
      total: cases.length,
      review: cases.filter((record) => record.status === "plan_draft").length,
      withOverdue: summaries.filter((summary) => summary.overdueCount > 0).length,
      overdueSteps: overdueRows.length,
    },
  };
}
