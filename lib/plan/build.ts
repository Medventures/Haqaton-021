import { getDocument, requireService, serviceIndex } from "@/lib/catalog";
import { addDays, formatAge, plural, toDateOnly } from "@/lib/dates";
import { L, type Localized } from "@/lib/i18n/locale";
import type { Facts } from "@/lib/interview/facts";
import { describeFactValue } from "@/lib/interview/slots";
import { defaultsFor, templateExplanation } from "@/lib/plan/defaults";
import { evaluateEligibility } from "@/lib/plan/eligibility";
import {
  casePlanSchema,
  type CasePlan,
  type PlanStep,
  type Priority,
  type Responsible,
  type StepStatus,
} from "@/lib/plan/schema";

export type PlanDraftStep = {
  serviceId: string;
  priority: Priority;
  responsible: Responsible;
  deadlineDays: number;
  explanation: Localized;
};

export type PlanDraft = {
  summary: Localized | null;
  urgentReason: Localized | null;
  steps: PlanDraftStep[];
  nextServiceId: string | null;
};

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const URGENT_DEADLINE_DAYS = 7;
const MIN_GAP_AFTER_DEPENDENCY = 7;

const clampDays = (days: number) => Math.min(90, Math.max(1, Math.round(days)));

type Draftable = {
  serviceId: string;
  priority: Priority;
  responsible: Responsible;
  days: number;
  explanation: Localized;
  status: StepStatus;
  urgent: boolean;
};

function sortByDependencies(items: Draftable[]): Draftable[] {
  const present = new Set(items.map((item) => item.serviceId));
  const pending = new Map(items.map((item) => [item.serviceId, item]));
  const ordered: Draftable[] = [];
  const rank = (item: Draftable) => [
    item.status === "done" ? 0 : 1,
    item.urgent ? 0 : 1,
    PRIORITY_WEIGHT[item.priority],
    serviceIndex(item.serviceId),
  ];
  const compare = (a: Draftable, b: Draftable) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let index = 0; index < ra.length; index += 1) {
      if (ra[index] !== rb[index]) {
        return ra[index] - rb[index];
      }
    }
    return 0;
  };
  while (pending.size > 0) {
    const ready = [...pending.values()].filter((item) =>
      requireService(item.serviceId).dependsOn.every(
        (dependency) => !present.has(dependency) || !pending.has(dependency) || dependency === item.serviceId,
      ),
    );
    const next = (ready.length > 0 ? ready : [...pending.values()]).sort(compare)[0];
    ordered.push(next);
    pending.delete(next.serviceId);
  }
  return ordered;
}

export function pickNextStepId(steps: PlanStep[], preferredServiceId?: string | null): string | null {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const actionable = steps.filter(
    (step) =>
      step.status !== "done" &&
      step.status !== "blocked" &&
      step.dependsOn.every((dependency) => byId.get(dependency)?.status === "done"),
  );
  if (preferredServiceId) {
    const preferred = actionable.find((step) => step.serviceId === preferredServiceId);
    if (preferred) {
      return preferred.id;
    }
  }
  return actionable[0]?.id ?? steps.find((step) => step.status !== "done")?.id ?? null;
}

export function rulesSummary(facts: Facts, steps: Pick<PlanStep, "track">[], urgent: boolean): Localized {
  const ru: string[] = [];
  const kk: string[] = [];
  const ageRu = formatAge(facts.child_age_months, "ru");
  const ageKk = formatAge(facts.child_age_months, "kk");
  if (ageRu && ageKk) {
    ru.push(`Ребёнку ${ageRu}.`);
    kk.push(`Балаға ${ageKk}.`);
  }
  if (facts.main_concerns?.length) {
    ru.push(`Родителей беспокоит: ${describeFactValue("main_concerns", facts.main_concerns, "ru").toLowerCase()}.`);
    kk.push(`Ата-ананы алаңдатады: ${describeFactValue("main_concerns", facts.main_concerns, "kk").toLowerCase()}.`);
  }
  if (facts.diagnosis_status === "confirmed") {
    ru.push("Специалист уже поставил диагноз, поэтому маршрут направлен на помощь и поддержку по трём направлениям.");
    kk.push("Маман диагноз қойған, сондықтан бағдар үш бағыт бойынша көмек пен қолдауға бағытталған.");
  } else if (facts.diagnosis_status === "in_progress") {
    ru.push("Сейчас идёт обследование, маршрут помогает пройти его без пропусков и параллельно получить поддержку в образовании.");
    kk.push("Қазір тексеру жүріп жатыр, бағдар оны олқылықсыз өтуге және білім беруде қолдау алуға көмектеседі.");
  } else {
    ru.push("Диагноз специалисты не ставили, поэтому маршрут начинается с оценки развития у педиатра.");
    kk.push("Мамандар диагноз қоймаған, сондықтан бағдар педиатрдың дамуды бағалауынан басталады.");
  }
  if (urgent) {
    ru.push("В ответах есть признаки, о которых важно сообщить врачу в ближайшее время.");
    kk.push("Жауаптарда жақын арада дәрігерге айту маңызды белгілер бар.");
  }
  const counts = {
    medical: steps.filter((step) => step.track === "medical").length,
    education: steps.filter((step) => step.track === "education").length,
    social: steps.filter((step) => step.track === "social").length,
  };
  const partsRu = [
    counts.medical ? `медицина — ${counts.medical}` : null,
    counts.education ? `образование — ${counts.education}` : null,
    counts.social ? `соцзащита — ${counts.social}` : null,
  ].filter(Boolean);
  const partsKk = [
    counts.medical ? `медицина — ${counts.medical}` : null,
    counts.education ? `білім беру — ${counts.education}` : null,
    counts.social ? `әлеуметтік қорғау — ${counts.social}` : null,
  ].filter(Boolean);
  ru.push(`В плане ${steps.length} ${plural(steps.length, ["шаг", "шага", "шагов"])}: ${partsRu.join(", ")}.`);
  kk.push(`Жоспарда ${steps.length} қадам бар: ${partsKk.join(", ")}.`);
  return { ru: ru.join(" "), kk: kk.join(" ") };
}

export function makeStepDocuments(serviceId: string) {
  return requireService(serviceId).documents.map((documentId) => ({
    id: documentId,
    name: getDocument(documentId)?.name ?? documentId,
    ready: false,
  }));
}

function initialNote(status: StepStatus): Localized {
  if (status === "done") {
    return L("Выполнено до начала маршрута (по ответам родителя)", "Бағдар басталғанға дейін орындалған (ата-ананың жауаптары бойынша)");
  }
  if (status === "in_progress") {
    return L("Уже в процессе (по ответам родителя)", "Қазір орындалуда (ата-ананың жауаптары бойынша)");
  }
  return L("Шаг добавлен в план", "Қадам жоспарға қосылды");
}

export function buildPlan(options: {
  facts: Facts;
  draft: PlanDraft | null;
  generatedBy: "ai" | "rules";
  now: Date;
  visibleToFamily: boolean;
}): CasePlan {
  const { facts, draft, generatedBy, now, visibleToFamily } = options;
  const eligibility = evaluateEligibility(facts);
  const today = toDateOnly(now);
  const nowIso = now.toISOString();
  const done = new Set(eligibility.done);
  const inProgress = new Set(eligibility.inProgress);

  const items: Draftable[] = eligibility.allowed.map((serviceId) => {
    const service = requireService(serviceId);
    const defaults = defaultsFor(serviceId);
    const fromDraft = draft?.steps.find((step) => step.serviceId === serviceId);
    const urgent = serviceId === eligibility.urgentServiceId;
    const template = templateExplanation(serviceId);
    return {
      serviceId,
      priority: urgent ? "high" : (fromDraft?.priority ?? defaults.priority),
      responsible: fromDraft?.responsible ?? defaults.responsible,
      days: urgent ? URGENT_DEADLINE_DAYS : clampDays(fromDraft?.deadlineDays ?? service.deadlineDays),
      explanation: {
        ru: fromDraft?.explanation.ru?.trim() || template.ru,
        kk: fromDraft?.explanation.kk?.trim() || template.kk,
      },
      status: done.has(serviceId) ? "done" : inProgress.has(serviceId) ? "in_progress" : "not_started",
      urgent,
    };
  });

  const ordered = sortByDependencies(items);
  const idByService = new Map(ordered.map((item, index) => [item.serviceId, `s${index + 1}`]));
  const offsetByService = new Map<string, number>();

  const steps: PlanStep[] = ordered.map((item) => {
    const service = requireService(item.serviceId);
    const dependencies = service.dependsOn.filter((dependency) => idByService.has(dependency));
    let offset = 0;
    if (item.status !== "done") {
      const dependencyOffset = Math.max(
        0,
        ...dependencies
          .filter((dependency) => ordered.find((candidate) => candidate.serviceId === dependency)?.status !== "done")
          .map((dependency) => offsetByService.get(dependency) ?? 0),
      );
      offset = item.urgent
        ? item.days
        : clampDays(Math.max(item.days, dependencyOffset > 0 ? dependencyOffset + MIN_GAP_AFTER_DEPENDENCY : 0));
    }
    offsetByService.set(item.serviceId, offset);
    const note = initialNote(item.status);
    return {
      id: idByService.get(item.serviceId)!,
      serviceId: item.serviceId,
      track: service.track,
      title: service.title,
      organization: service.organization,
      priority: item.priority,
      responsible: item.responsible,
      deadline: addDays(today, offset),
      documents: makeStepDocuments(item.serviceId).map((document) => ({ ...document, ready: item.status === "done" })),
      explanation: item.explanation.ru,
      explanationKk: item.explanation.kk,
      dependsOn: dependencies.map((dependency) => idByService.get(dependency)!),
      status: item.status,
      history: [{ at: nowIso, by: "system", status: item.status, note: note.ru, noteKk: note.kk }],
    };
  });

  const preferred = eligibility.urgentServiceId ?? draft?.nextServiceId ?? null;
  const summary = rulesSummary(facts, steps, eligibility.urgent);
  const plan: CasePlan = {
    version: 1,
    generatedAt: nowIso,
    generatedBy,
    approved: false,
    approvedAt: null,
    approvedBy: null,
    visibleToFamily,
    summary: draft?.summary?.ru?.trim() || summary.ru,
    summaryKk: draft?.summary?.kk?.trim() || summary.kk,
    urgent: eligibility.urgent,
    urgentReason: eligibility.urgent ? draft?.urgentReason?.ru?.trim() || eligibility.urgentReason?.ru || null : null,
    urgentReasonKk: eligibility.urgent ? draft?.urgentReason?.kk?.trim() || eligibility.urgentReason?.kk || null : null,
    nextStepId: pickNextStepId(steps, preferred),
    steps,
  };
  return casePlanSchema.parse(plan);
}
