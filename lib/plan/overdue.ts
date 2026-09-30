import { diffDays } from "@/lib/dates";
import type { CasePlan, PlanStep } from "@/lib/plan/schema";

export const ESCALATION_LEVEL_2_DAYS = 7;

export type DisplayStatus = PlanStep["status"] | "overdue";

export function overdueDays(step: Pick<PlanStep, "status" | "deadline">, today: string): number {
  if (step.status === "done") {
    return 0;
  }
  return Math.max(0, diffDays(today, step.deadline));
}

export function isOverdue(step: Pick<PlanStep, "status" | "deadline">, today: string): boolean {
  return overdueDays(step, today) > 0;
}

export function escalationLevel(days: number): 0 | 1 | 2 {
  if (days > ESCALATION_LEVEL_2_DAYS) {
    return 2;
  }
  return days > 0 ? 1 : 0;
}

export function displayStatus(step: PlanStep, today: string): DisplayStatus {
  return isOverdue(step, today) ? "overdue" : step.status;
}

export function overdueSteps(plan: CasePlan | null, today: string) {
  if (!plan || !plan.approved) {
    return [];
  }
  return plan.steps
    .map((step) => ({ step, days: overdueDays(step, today) }))
    .filter((item) => item.days > 0)
    .map((item) => ({ ...item, level: escalationLevel(item.days) }));
}

export function planProgress(plan: CasePlan | null): { done: number; total: number } {
  if (!plan) {
    return { done: 0, total: 0 };
  }
  return {
    done: plan.steps.filter((step) => step.status === "done").length,
    total: plan.steps.length,
  };
}
