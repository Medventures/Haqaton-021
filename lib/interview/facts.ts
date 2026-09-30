import { z } from "zod";

export const concernValues = ["speech", "social", "behavior", "sleep_food", "other"] as const;
export const redFlagValues = ["none", "skill_loss", "self_harm", "aggression", "seizures"] as const;
export const diagnosisValues = ["none", "in_progress", "confirmed"] as const;
export const diagnosedByValues = ["psychiatrist", "neurologist", "private_clinic", "other"] as const;
export const screeningValues = ["yes", "no", "unknown"] as const;
export const yesNoValues = ["yes", "no"] as const;
export const specialistsValues = ["yes", "partial", "no"] as const;
export const pmpkValues = ["none", "done", "expired"] as const;
export const correctionValues = ["none", "kppk", "rehab_center", "private"] as const;
export const educationValues = ["home", "kindergarten", "special_group", "school", "inclusive_class"] as const;
export const disabilityValues = ["none", "in_process", "established"] as const;
export const iprBenefitsValues = ["ipr", "benefits", "nothing"] as const;

export const factsSchema = z.object({
  child_age_months: z.number().int().min(0).max(216).optional(),
  main_concerns: z.array(z.enum(concernValues)).min(1).optional(),
  red_flags: z.array(z.enum(redFlagValues)).min(1).optional(),
  diagnosis_status: z.enum(diagnosisValues).optional(),
  diagnosed_by: z.enum(diagnosedByValues).optional(),
  screening_done: z.enum(screeningValues).optional(),
  hearing_checked: z.enum(yesNoValues).optional(),
  specialists_done: z.enum(specialistsValues).optional(),
  dynamic_observation: z.enum(yesNoValues).optional(),
  pmpk_status: z.enum(pmpkValues).optional(),
  correction_help: z.enum(correctionValues).optional(),
  education_place: z.enum(educationValues).optional(),
  disability_status: z.enum(disabilityValues).optional(),
  vkk_done: z.enum(yesNoValues).optional(),
  ipr_benefits: z.array(z.enum(iprBenefitsValues)).min(1).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  extra: z.record(z.string(), z.union([z.string().max(500), z.array(z.string().max(100)).max(20)])).optional(),
});

export type ExtraAnswer = string | string[];

export type Facts = z.infer<typeof factsSchema>;
export type SlotId = Exclude<keyof Facts, "extra">;
export type RedFlag = (typeof redFlagValues)[number];

export const slotIds = Object.keys(factsSchema.shape).filter((key) => key !== "extra") as [SlotId, ...SlotId[]];

export function sanitizeFacts(input: Record<string, unknown>): Facts {
  const result: Record<string, unknown> = {};
  const extra = factsSchema.shape.extra.safeParse(input.extra);
  if (extra.success && extra.data && Object.keys(extra.data).length > 0) {
    result.extra = extra.data;
  }
  for (const slot of slotIds) {
    const value = input[slot];
    if (value === undefined || value === null) {
      continue;
    }
    const parsed = factsSchema.shape[slot].safeParse(value);
    if (parsed.success && parsed.data !== undefined) {
      result[slot] = parsed.data;
    }
  }
  return result as Facts;
}

export function activeRedFlags(facts: Facts): RedFlag[] {
  return (facts.red_flags ?? []).filter((flag) => flag !== "none");
}

export function mergeRedFlags(current: RedFlag[] | undefined, incoming: RedFlag[] | undefined): RedFlag[] | undefined {
  if (!incoming || incoming.length === 0) {
    return current;
  }
  const active = new Set<RedFlag>([...(current ?? []), ...incoming].filter((flag) => flag !== "none"));
  if (active.size > 0) {
    return [...active];
  }
  return ["none"];
}

export function mergeFacts(base: Facts, patch: Facts): Facts {
  const merged: Facts = { ...base, ...patch };
  if (patch.extra || base.extra) {
    merged.extra = { ...(base.extra ?? {}), ...(patch.extra ?? {}) };
  }
  if (patch.red_flags) {
    merged.red_flags = mergeRedFlags(base.red_flags, patch.red_flags);
  }
  return merged;
}
