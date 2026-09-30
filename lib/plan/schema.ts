import { z } from "zod";
import { allServiceIds, getService } from "@/lib/catalog";

export const TRACKS = ["medical", "education", "social"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const RESPONSIBLES = ["parent", "curator", "organization"] as const;
export const STEP_STATUSES = ["not_started", "in_progress", "done", "blocked"] as const;
export const HISTORY_ACTORS = ["system", "curator", "parent"] as const;
export const CASE_STATUSES = ["interview", "plan_draft", "approved"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Responsible = (typeof RESPONSIBLES)[number];
export type StepStatus = (typeof STEP_STATUSES)[number];
export type HistoryActor = (typeof HISTORY_ACTORS)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const planDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  ready: z.boolean(),
});

export const historyEntrySchema = z.object({
  at: z.iso.datetime(),
  by: z.enum(HISTORY_ACTORS),
  status: z.enum(STEP_STATUSES),
  note: z.string().max(1000).nullable(),
  noteKk: z.string().max(1000).nullable().default(null),
});

export const planStepSchema = z.object({
  id: z.string().regex(/^s\d+$/),
  serviceId: z.enum(allServiceIds),
  track: z.enum(TRACKS),
  title: z.string().min(1),
  organization: z.string().min(1),
  priority: z.enum(PRIORITIES),
  responsible: z.enum(RESPONSIBLES),
  deadline: z.iso.date(),
  documents: z.array(planDocumentSchema),
  explanation: z.string().trim().min(1).max(1500),
  explanationKk: z.string().trim().min(1).max(1500),
  dependsOn: z.array(z.string()),
  status: z.enum(STEP_STATUSES),
  history: z.array(historyEntrySchema).min(1),
});

export const casePlanSchema = z
  .object({
    version: z.literal(1),
    generatedAt: z.iso.datetime(),
    generatedBy: z.enum(["ai", "rules"]),
    approved: z.boolean(),
    approvedAt: z.iso.datetime().nullable(),
    approvedBy: z.string().nullable(),
    visibleToFamily: z.boolean(),
    summary: z.string().trim().min(1).max(2000),
    summaryKk: z.string().trim().min(1).max(2000),
    urgent: z.boolean(),
    urgentReason: z.string().nullable(),
    urgentReasonKk: z.string().nullable(),
    nextStepId: z.string().nullable(),
    steps: z.array(planStepSchema).min(1),
  })
  .superRefine((plan, ctx) => {
    const stepIds = new Set<string>();
    const serviceIds = new Set<string>();
    plan.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        ctx.addIssue({ code: "custom", path: ["steps", index, "id"], message: `Повторяющийся id шага ${step.id}` });
      }
      stepIds.add(step.id);
      if (serviceIds.has(step.serviceId)) {
        ctx.addIssue({ code: "custom", path: ["steps", index, "serviceId"], message: `Услуга ${step.serviceId} уже есть в плане` });
      }
      serviceIds.add(step.serviceId);
      const service = getService(step.serviceId);
      if (!service) {
        ctx.addIssue({ code: "custom", path: ["steps", index, "serviceId"], message: "Услуги нет в справочнике" });
        return;
      }
      if (step.track !== service.track || step.title !== service.title || step.organization !== service.organization) {
        ctx.addIssue({ code: "custom", path: ["steps", index], message: "Название, организация и направление должны совпадать со справочником" });
      }
      const documentIds = step.documents.map((document) => document.id).join(",");
      if (documentIds !== service.documents.join(",")) {
        ctx.addIssue({ code: "custom", path: ["steps", index, "documents"], message: "Документы должны совпадать со справочником" });
      }
    });
    plan.steps.forEach((step, index) => {
      step.dependsOn.forEach((dependency) => {
        if (dependency === step.id || !stepIds.has(dependency)) {
          ctx.addIssue({ code: "custom", path: ["steps", index, "dependsOn"], message: `Неизвестная зависимость ${dependency}` });
        }
      });
    });
    if (plan.nextStepId !== null && !stepIds.has(plan.nextStepId)) {
      ctx.addIssue({ code: "custom", path: ["nextStepId"], message: "nextStepId не найден среди шагов" });
    }
    if (plan.approved && (!plan.approvedAt || !plan.approvedBy)) {
      ctx.addIssue({ code: "custom", path: ["approvedAt"], message: "У подтверждённого плана должны быть approvedAt и approvedBy" });
    }
  });

export type PlanDocument = z.infer<typeof planDocumentSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type PlanStep = z.infer<typeof planStepSchema>;
export type CasePlan = z.infer<typeof casePlanSchema>;
