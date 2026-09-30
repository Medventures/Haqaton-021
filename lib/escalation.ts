import type { EscalationEvent } from "@prisma/client";
import { parseCaseRow } from "@/lib/cases";
import { addDays, dateAtMorning, toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { ESCALATION_LEVEL_2_DAYS, overdueDays } from "@/lib/plan/overdue";
import type { CasePlan } from "@/lib/plan/schema";
import { now } from "@/lib/time";

function belongsToEpisode(event: EscalationEvent, deadline: string): boolean {
  return toDateOnly(event.createdAt) > deadline;
}

export async function syncCaseEscalations(caseId: string, plan: CasePlan | null, current: Date): Promise<void> {
  const events = await prisma.escalationEvent.findMany({ where: { caseId } });
  const today = toDateOnly(current);
  const toCreate: { caseId: string; stepId: string; level: number; createdAt: Date }[] = [];
  const toResolve: { id: string; note: string }[] = [];
  const steps = plan?.approved ? plan.steps : [];
  const stepIds = new Set(steps.map((step) => step.id));

  for (const event of events) {
    if (!event.resolvedAt && !stepIds.has(event.stepId)) {
      toResolve.push({ id: event.id, note: "Шаг удалён из плана" });
    }
  }

  for (const step of steps) {
    const days = overdueDays(step, today);
    const stepEvents = events.filter((event) => event.stepId === step.id);
    const open = stepEvents.filter((event) => !event.resolvedAt);
    if (days === 0) {
      const note = step.status === "done" ? "Шаг выполнен" : "Срок перенесён";
      open.forEach((event) => toResolve.push({ id: event.id, note }));
      continue;
    }
    open
      .filter((event) => !belongsToEpisode(event, step.deadline) || (event.level === 2 && days <= ESCALATION_LEVEL_2_DAYS))
      .forEach((event) => toResolve.push({ id: event.id, note: "Срок перенесён" }));
    const levels = days > ESCALATION_LEVEL_2_DAYS ? [1, 2] : [1];
    for (const level of levels) {
      const exists = stepEvents.some((event) => event.level === level && belongsToEpisode(event, step.deadline));
      if (!exists) {
        const thresholdDate = addDays(step.deadline, level === 1 ? 1 : ESCALATION_LEVEL_2_DAYS + 1);
        const createdAt = dateAtMorning(thresholdDate) > current ? current : dateAtMorning(thresholdDate);
        toCreate.push({ caseId, stepId: step.id, level, createdAt });
      }
    }
  }

  const resolvedAt = current;
  await prisma.$transaction([
    ...toResolve.map((item) =>
      prisma.escalationEvent.update({ where: { id: item.id }, data: { resolvedAt, note: item.note } }),
    ),
    ...(toCreate.length > 0 ? [prisma.escalationEvent.createMany({ data: toCreate })] : []),
  ]);
}

async function runAll(): Promise<void> {
  const current = await now();
  const rows = await prisma.case.findMany({
    where: { status: "approved", curatorId: { not: null } },
    include: { parent: true, curator: true },
  });
  for (const row of rows) {
    const record = parseCaseRow(row);
    await syncCaseEscalations(record.id, record.plan, current);
  }
}

let running: Promise<void> | null = null;

export function runEscalations(): Promise<void> {
  if (!running) {
    running = runAll().finally(() => {
      running = null;
    });
  }
  return running;
}

export async function resolveStepEscalations(caseId: string, stepId: string, note: string, at: Date): Promise<number> {
  const result = await prisma.escalationEvent.updateMany({
    where: { caseId, stepId, resolvedAt: null },
    data: { resolvedAt: at, note },
  });
  return result.count;
}
