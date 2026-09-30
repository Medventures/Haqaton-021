import type { Localized } from "@/lib/i18n/locale";
import type { Facts } from "@/lib/interview/facts";
import type { QuestionDef } from "@/lib/interview/slots";
import { requestPlanDraft } from "@/lib/plan/ai";
import { buildPlan, type PlanDraft } from "@/lib/plan/build";
import { evaluateEligibility } from "@/lib/plan/eligibility";
import { isSafeText } from "@/lib/plan/guard";
import type { CasePlan } from "@/lib/plan/schema";

function safe(value: Localized | null): boolean {
  return !value || (isSafeText(value.ru) && isSafeText(value.kk));
}

function draftIsSafe(draft: PlanDraft): boolean {
  return safe(draft.summary) && safe(draft.urgentReason) && draft.steps.every((step) => safe(step.explanation));
}

function sanitizeDraft(draft: PlanDraft): PlanDraft {
  return {
    summary: safe(draft.summary) ? draft.summary : null,
    urgentReason: safe(draft.urgentReason) ? draft.urgentReason : null,
    nextServiceId: draft.nextServiceId,
    steps: draft.steps.map((step) => (safe(step.explanation) ? step : { ...step, explanation: { ru: "", kk: "" } })),
  };
}

export async function generatePlan(defs: QuestionDef[], facts: Facts, now: Date, visibleToFamily: boolean): Promise<CasePlan> {
  const eligibility = evaluateEligibility(facts);
  let draft = await requestPlanDraft(defs, facts, eligibility);
  if (draft && !draftIsSafe(draft)) {
    const retry = await requestPlanDraft(defs, facts, eligibility, { strict: true });
    draft = retry && draftIsSafe(retry) ? retry : sanitizeDraft(retry ?? draft);
  }
  try {
    return buildPlan({ facts, draft, generatedBy: draft ? "ai" : "rules", now, visibleToFamily });
  } catch (error) {
    console.error("Не удалось собрать план из ответа AI, используем правила", error);
    return buildPlan({ facts, draft: null, generatedBy: "rules", now, visibleToFamily });
  }
}
