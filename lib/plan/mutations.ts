import { z } from "zod";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { getCase, saveCase, type CaseRecord } from "@/lib/cases";
import { documentName, getService, requireService, serviceIndex } from "@/lib/catalog";
import { formatDateShort, toDateOnly } from "@/lib/dates";
import { resolveStepEscalations, syncCaseEscalations } from "@/lib/escalation";
import { L, type Localized } from "@/lib/i18n/locale";
import { ru } from "@/lib/i18n/ru";
import { kk } from "@/lib/i18n/kk";
import { makeStepDocuments, pickNextStepId } from "@/lib/plan/build";
import { defaultsFor, templateExplanation } from "@/lib/plan/defaults";
import {
  casePlanSchema,
  PRIORITIES,
  RESPONSIBLES,
  STEP_STATUSES,
  type CasePlan,
  type HistoryActor,
  type PlanStep,
} from "@/lib/plan/schema";

const stepId = z.string().min(1);

export const caseActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("updateStep"),
    stepId,
    priority: z.enum(PRIORITIES).optional(),
    responsible: z.enum(RESPONSIBLES).optional(),
    deadline: z.iso.date().optional(),
    explanation: z.string().trim().min(1).max(1500).optional(),
    explanationKk: z.string().trim().min(1).max(1500).optional(),
  }),
  z.object({ type: z.literal("removeStep"), stepId }),
  z.object({ type: z.literal("addStep"), serviceId: z.string().min(1) }),
  z.object({ type: z.literal("approve") }),
  z.object({
    type: z.literal("setStatus"),
    stepId,
    status: z.enum(STEP_STATUSES),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    type: z.literal("moveDeadline"),
    stepId,
    deadline: z.iso.date(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({ type: z.literal("toggleDocument"), stepId, documentId: z.string().min(1), ready: z.boolean() }),
  z.object({ type: z.literal("markDone"), stepId }),
  z.object({ type: z.literal("resolveEscalation"), stepId, note: z.string().trim().max(500).optional() }),
]);

export type CaseAction = z.infer<typeof caseActionSchema>;

const CURATOR_DRAFT_ACTIONS = new Set(["updateStep", "removeStep", "addStep", "approve"]);
const CURATOR_APPROVED_ACTIONS = new Set(["setStatus", "moveDeadline", "resolveEscalation"]);
const PARENT_ALWAYS = new Set(["toggleDocument", "markDone"]);
const PARENT_SELF_MANAGED = new Set(["setStatus", "moveDeadline"]);

function findStep(plan: CasePlan, id: string): PlanStep {
  const step = plan.steps.find((candidate) => candidate.id === id);
  if (!step) {
    throw new ApiError(404, "stepNotFound");
  }
  return step;
}

function log(step: PlanStep, at: string, by: HistoryActor, note: Localized) {
  step.history.push({ at, by, status: step.status, note: note.ru, noteKk: note.kk });
}

function nextStepIdAfterChange(plan: CasePlan): string | null {
  const current = plan.steps.find((step) => step.id === plan.nextStepId);
  if (current && current.status !== "done" && current.status !== "blocked") {
    return current.id;
  }
  return pickNextStepId(plan.steps);
}

export function canParentSeePlan(record: CaseRecord): boolean {
  return Boolean(record.plan && (record.plan.visibleToFamily || record.plan.approved));
}

function authorize(record: CaseRecord, user: CurrentUser, action: CaseAction, plan: CasePlan) {
  if (user.role === "parent") {
    if (record.parentId !== user.id) {
      throw new ApiError(404, "caseNotFound");
    }
    if (!canParentSeePlan(record)) {
      throw new ApiError(409, "planHidden");
    }
    if (PARENT_ALWAYS.has(action.type)) {
      return;
    }
    if (PARENT_SELF_MANAGED.has(action.type)) {
      if (record.curatorId) {
        throw new ApiError(403, "curatorManages");
      }
      return;
    }
    if (action.type === "resolveEscalation") {
      throw new ApiError(403, "curatorRequired");
    }
    throw new ApiError(403, "forbidden");
  }
  if (user.role !== "curator" || record.curatorId !== user.id) {
    throw new ApiError(404, "caseNotFound");
  }
  if (action.type === "toggleDocument") {
    return;
  }
  if (CURATOR_DRAFT_ACTIONS.has(action.type) && plan.approved) {
    throw new ApiError(409, "planApprovedEdit");
  }
  if (CURATOR_APPROVED_ACTIONS.has(action.type) && !plan.approved) {
    throw new ApiError(409, "approveFirst");
  }
  if (!CURATOR_DRAFT_ACTIONS.has(action.type) && !CURATOR_APPROVED_ACTIONS.has(action.type)) {
    throw new ApiError(403, "forbidden");
  }
}

function statusLabel(status: PlanStep["status"]): Localized {
  return L(ru.statuses[status].toLowerCase(), kk.statuses[status].toLowerCase());
}

export async function applyCaseAction(caseId: string, user: CurrentUser, action: CaseAction): Promise<CaseRecord> {
  const record = await getCase(caseId);
  if (!record) {
    throw new ApiError(404, "caseNotFound");
  }
  if (!record.plan) {
    throw new ApiError(409, "planMissing");
  }
  const plan: CasePlan = structuredClone(record.plan);
  authorize(record, user, action, plan);
  const current = new Date();
  const at = current.toISOString();
  const today = toDateOnly(current);
  const actor: HistoryActor = user.role === "curator" ? "curator" : "parent";
  let status = record.status;

  switch (action.type) {
    case "updateStep": {
      const step = findStep(plan, action.stepId);
      const changesRu: string[] = [];
      const changesKk: string[] = [];
      if (action.priority && action.priority !== step.priority) {
        changesRu.push(`приоритет: ${ru.priorities[step.priority].toLowerCase()} → ${ru.priorities[action.priority].toLowerCase()}`);
        changesKk.push(`басымдық: ${kk.priorities[step.priority].toLowerCase()} → ${kk.priorities[action.priority].toLowerCase()}`);
        step.priority = action.priority;
      }
      if (action.responsible && action.responsible !== step.responsible) {
        changesRu.push(`ответственный: ${ru.responsible[step.responsible].toLowerCase()} → ${ru.responsible[action.responsible].toLowerCase()}`);
        changesKk.push(`жауапты: ${kk.responsible[step.responsible].toLowerCase()} → ${kk.responsible[action.responsible].toLowerCase()}`);
        step.responsible = action.responsible;
      }
      if (action.deadline && action.deadline !== step.deadline) {
        if (action.deadline < today) {
          throw new ApiError(400, "deadlinePast");
        }
        changesRu.push(`срок: ${formatDateShort(step.deadline)} → ${formatDateShort(action.deadline)}`);
        changesKk.push(`мерзімі: ${formatDateShort(step.deadline)} → ${formatDateShort(action.deadline)}`);
        step.deadline = action.deadline;
      }
      if (action.explanation && action.explanation !== step.explanation) {
        changesRu.push("объяснение (рус.) обновлено");
        changesKk.push("түсіндірме (орыс.) жаңартылды");
        step.explanation = action.explanation;
      }
      if (action.explanationKk && action.explanationKk !== step.explanationKk) {
        changesRu.push("объяснение (каз.) обновлено");
        changesKk.push("түсіндірме (қаз.) жаңартылды");
        step.explanationKk = action.explanationKk;
      }
      if (changesRu.length === 0) {
        return record;
      }
      log(step, at, actor, L(`Куратор изменил ${changesRu.join("; ")}`, `Куратор өзгертті: ${changesKk.join("; ")}`));
      break;
    }
    case "removeStep": {
      findStep(plan, action.stepId);
      if (plan.steps.length === 1) {
        throw new ApiError(400, "needOneStep");
      }
      plan.steps = plan.steps
        .filter((step) => step.id !== action.stepId)
        .map((step) => ({ ...step, dependsOn: step.dependsOn.filter((dependency) => dependency !== action.stepId) }));
      break;
    }
    case "addStep": {
      const service = getService(action.serviceId);
      if (!service) {
        throw new ApiError(400, "catalogOnly");
      }
      if (plan.steps.some((step) => step.serviceId === service.id)) {
        throw new ApiError(409, "serviceExists");
      }
      const maxId = Math.max(0, ...plan.steps.map((step) => Number(step.id.slice(1))));
      const idByService = new Map(plan.steps.map((step) => [step.serviceId, step.id]));
      const deadline = toDateOnly(new Date(current.getTime() + service.deadlineDays * 86_400_000));
      const defaults = defaultsFor(service.id);
      const explanation = templateExplanation(service.id);
      const newStep: PlanStep = {
        id: `s${maxId + 1}`,
        serviceId: service.id,
        track: service.track,
        title: service.title,
        organization: service.organization,
        priority: defaults.priority,
        responsible: defaults.responsible,
        deadline,
        documents: makeStepDocuments(service.id),
        explanation: explanation.ru,
        explanationKk: explanation.kk,
        dependsOn: service.dependsOn.flatMap((dependency) => idByService.get(dependency) ?? []),
        status: "not_started",
        history: [
          {
            at,
            by: actor,
            status: "not_started",
            note: "Куратор добавил шаг из справочника",
            noteKk: "Куратор анықтамалықтан қадам қосты",
          },
        ],
      };
      plan.steps.forEach((step) => {
        if (requireService(step.serviceId).dependsOn.includes(service.id)) {
          step.dependsOn = [...step.dependsOn, newStep.id];
        }
      });
      const insertAt = plan.steps.findIndex(
        (step) => step.track === service.track && serviceIndex(step.serviceId) > serviceIndex(service.id),
      );
      const lastInTrack = plan.steps.map((step) => step.track).lastIndexOf(service.track);
      const position = insertAt >= 0 ? insertAt : lastInTrack >= 0 ? lastInTrack + 1 : plan.steps.length;
      plan.steps.splice(position, 0, newStep);
      break;
    }
    case "approve": {
      plan.approved = true;
      plan.approvedAt = at;
      plan.approvedBy = user.name;
      plan.visibleToFamily = true;
      status = "approved";
      break;
    }
    case "setStatus": {
      const step = findStep(plan, action.stepId);
      if (step.status === action.status) {
        return record;
      }
      const previous = statusLabel(step.status);
      const next = statusLabel(action.status);
      step.status = action.status;
      const suffix = action.note ? `. ${action.note}` : "";
      log(step, at, actor, L(`Статус: ${previous.ru} → ${next.ru}${suffix}`, `Мәртебе: ${previous.kk} → ${next.kk}${suffix}`));
      break;
    }
    case "moveDeadline": {
      const step = findStep(plan, action.stepId);
      if (action.deadline < today) {
        throw new ApiError(400, "deadlinePast");
      }
      const previous = formatDateShort(step.deadline);
      const next = formatDateShort(action.deadline);
      step.deadline = action.deadline;
      log(
        step,
        at,
        actor,
        L(`Срок перенесён: ${previous} → ${next}. Причина: ${action.reason}`, `Мерзім ауыстырылды: ${previous} → ${next}. Себебі: ${action.reason}`),
      );
      break;
    }
    case "toggleDocument": {
      const step = findStep(plan, action.stepId);
      const document = step.documents.find((candidate) => candidate.id === action.documentId);
      if (!document) {
        throw new ApiError(404, "documentNotFound");
      }
      if (document.ready === action.ready) {
        return record;
      }
      document.ready = action.ready;
      log(
        step,
        at,
        actor,
        L(
          `${action.ready ? "Документ готов" : "Документ снят с готовых"}: ${documentName(document.id, "ru", document.name)}`,
          `${action.ready ? "Құжат дайын" : "Құжат дайындардан алынды"}: ${documentName(document.id, "kk", document.name)}`,
        ),
      );
      break;
    }
    case "markDone": {
      const step = findStep(plan, action.stepId);
      if (step.status === "done") {
        return record;
      }
      step.status = "done";
      log(step, at, actor, L("Родитель отметил шаг выполненным", "Ата-ана қадамды орындалды деп белгіледі"));
      break;
    }
    case "resolveEscalation": {
      const step = findStep(plan, action.stepId);
      const note = action.note || "Куратор отметил эскалацию решённой";
      const count = await resolveStepEscalations(caseId, step.id, note, current);
      if (count === 0) {
        throw new ApiError(409, "noOpenEscalations");
      }
      log(step, at, actor, L(`Эскалация закрыта: ${note}`, `Эскалация жабылды: ${action.note || "куратор шешілді деп белгіледі"}`));
      break;
    }
  }

  plan.nextStepId = nextStepIdAfterChange(plan);
  const validated = casePlanSchema.parse(plan);
  await saveCase(caseId, { plan: validated, status });
  await syncCaseEscalations(caseId, record.curatorId ? validated : null, current);
  return { ...record, plan: validated, status };
}

export async function markPlanDocumentsReady(caseId: string, documentId: string, actor: HistoryActor, fileTitle: string): Promise<void> {
  const record = await getCase(caseId);
  if (!record?.plan) {
    return;
  }
  const plan: CasePlan = structuredClone(record.plan);
  const at = new Date().toISOString();
  let changed = false;
  for (const step of plan.steps) {
    const document = step.documents.find((candidate) => candidate.id === documentId);
    if (document && !document.ready) {
      document.ready = true;
      changed = true;
      log(
        step,
        at,
        actor,
        L(
          `Документ загружен в хранилище: ${documentName(documentId, "ru")} (${fileTitle})`,
          `Құжат қоймаға жүктелді: ${documentName(documentId, "kk")} (${fileTitle})`,
        ),
      );
    }
  }
  if (changed) {
    await saveCase(caseId, { plan: casePlanSchema.parse(plan) });
  }
}
