import { z } from "zod";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { fromLocalDateTime, toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { MOODS, TRIGGERS, type Trigger } from "@/lib/journal-types";

const daySchema = z.iso.date();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const dailyEntrySchema = z.object({
  day: daySchema,
  sleepHours: z.number().min(0).max(24).nullable(),
  mood: z.enum(MOODS).nullable(),
  notes: z.string().trim().max(2000),
});

export const meltdownSchema = z.object({
  day: daySchema,
  time: timeSchema,
  durationMinutes: z.number().int().min(1).max(1440).nullable(),
  intensity: z.number().int().min(1).max(3),
  triggers: z.array(z.enum(TRIGGERS)).max(TRIGGERS.length),
  before: z.string().trim().max(1000),
  behavior: z.string().trim().max(1000),
  response: z.string().trim().max(1000),
  after: z.string().trim().max(1000),
});

export async function assertJournalAccess(user: CurrentUser, caseId: string): Promise<void> {
  const record = await prisma.case.findUnique({ where: { id: caseId }, select: { parentId: true, curatorId: true } });
  if (!record) throw new ApiError(404, "caseNotFound");
  if (user.role === "parent" && record.parentId === user.id) return;
  if (user.role === "curator" && record.curatorId === user.id) return;
  if (user.role === "specialist") {
    const access = await prisma.caseSpecialistAccess.findFirst({ where: { caseId, specialistId: user.id, specialist: { specialistProfile: { status: "approved" } } } });
    if (access) return;
  }
  throw new ApiError(404, "caseNotFound");
}

export async function loadJournal(caseId: string) {
  const [days, episodes] = await Promise.all([
    prisma.dailyEntry.findMany({ where: { caseId }, orderBy: { day: "desc" } }),
    prisma.meltdown.findMany({ where: { caseId }, orderBy: { occurredAt: "desc" } }),
  ]);
  const counts = Object.fromEntries(TRIGGERS.map((trigger) => [trigger, 0])) as Record<Trigger, number>;
  const meltdowns = episodes.map((episode) => {
    const triggers = z.array(z.enum(TRIGGERS)).safeParse(JSON.parse(episode.triggers));
    const values = triggers.success ? triggers.data : [];
    for (const trigger of values) counts[trigger]++;
    return {
      id: episode.id,
      occurredAt: episode.occurredAt.toISOString(),
      durationMinutes: episode.durationMinutes,
      intensity: episode.intensity,
      triggers: values,
      before: episode.before,
      behavior: episode.behavior,
      response: episode.response,
      after: episode.after,
    };
  });
  return {
    days: days.map((day) => ({ day: day.day, sleepHours: day.sleepHours, mood: day.mood as (typeof MOODS)[number] | null, notes: day.notes })),
    meltdowns,
    triggerCounts: TRIGGERS.map((trigger) => ({ trigger, count: counts[trigger] })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count),
  };
}

export async function saveDailyEntry(caseId: string, input: z.infer<typeof dailyEntrySchema>) {
  if (input.day > toDateOnly(new Date())) throw new ApiError(400, "invalidDate");
  await prisma.dailyEntry.upsert({
    where: { caseId_day: { caseId, day: input.day } },
    update: { sleepHours: input.sleepHours, mood: input.mood, notes: input.notes },
    create: { caseId, ...input },
  });
}

export async function addMeltdown(caseId: string, input: z.infer<typeof meltdownSchema>) {
  const occurredAt = fromLocalDateTime(input.day, input.time);
  if (Number.isNaN(occurredAt.getTime()) || toDateOnly(occurredAt) !== input.day || occurredAt.getTime() > Date.now()) {
    throw new ApiError(400, "invalidDate");
  }
  await prisma.meltdown.create({
    data: {
      caseId,
      occurredAt,
      durationMinutes: input.durationMinutes,
      intensity: input.intensity,
      triggers: JSON.stringify([...new Set(input.triggers)]),
      before: input.before,
      behavior: input.behavior,
      response: input.response,
      after: input.after,
    },
  });
}
