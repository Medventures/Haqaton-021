import { documentName, serviceOrganization, serviceTitle } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n/locale";
import type { CasePlan, HistoryEntry, PlanDocument, PlanStep } from "@/lib/plan/schema";

export function stepTitle(step: PlanStep, locale: Locale): string {
  return serviceTitle(step.serviceId, locale, step.title);
}

export function stepOrganization(step: PlanStep, locale: Locale): string {
  return serviceOrganization(step.serviceId, locale, step.organization);
}

export function stepExplanation(step: PlanStep, locale: Locale): string {
  return locale === "kk" ? step.explanationKk || step.explanation : step.explanation;
}

export function planDocumentName(document: PlanDocument, locale: Locale): string {
  return documentName(document.id, locale, document.name);
}

export function planSummary(plan: CasePlan, locale: Locale): string {
  return locale === "kk" ? plan.summaryKk || plan.summary : plan.summary;
}

export function planUrgentReason(plan: CasePlan, locale: Locale): string | null {
  return locale === "kk" ? plan.urgentReasonKk || plan.urgentReason : plan.urgentReason;
}

export function historyNote(entry: HistoryEntry, locale: Locale): string | null {
  return locale === "kk" ? entry.noteKk || entry.note : entry.note;
}
