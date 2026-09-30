import { z } from "zod";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { EVENT_TYPES, type CalendarEventView, type EventType } from "@/lib/calendar-types";
import { prisma } from "@/lib/db";

export { EVENT_TYPES };
export type { CalendarEventView, EventType };

export const createEventSchema = z.object({
  caseId: z.string().min(1).nullable(),
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1).max(160),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  repeat: z.enum(["none", "daily", "weekly"]).default("none"),
  repeatCount: z.number().int().min(1).max(60).default(1),
});

export async function accessibleCaseIds(user: CurrentUser): Promise<string[]> {
  if (user.role === "parent") {
    return (await prisma.case.findMany({ where: { parentId: user.id }, select: { id: true } })).map((row) => row.id);
  }
  if (user.role === "curator") {
    return (await prisma.case.findMany({ where: { curatorId: user.id }, select: { id: true } })).map((row) => row.id);
  }
  return [];
}

export async function listEvents(user: CurrentUser, from: Date, to: Date, caseId?: string | null): Promise<CalendarEventView[]> {
  const caseIds = await accessibleCaseIds(user);
  const scope = caseId ? (caseIds.includes(caseId) ? [caseId] : []) : caseIds;
  const rows = await prisma.calendarEvent.findMany({
    where: {
      startsAt: { gte: from, lt: to },
      OR: [
        { caseId: { in: scope } },
        ...(user.role === "curator" && !caseId ? [{ caseId: null, ownerId: user.id }] : []),
      ],
    },
    include: { owner: { select: { name: true } }, case: { select: { childName: true } } },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    caseId: row.caseId,
    childName: row.case?.childName ?? null,
    type: (EVENT_TYPES as readonly string[]).includes(row.type) ? (row.type as EventType) : "other",
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    notes: row.notes,
    ownerName: row.owner.name,
    canDelete: row.ownerId === user.id || (user.role === "parent" && row.caseId !== null && caseIds.includes(row.caseId)),
  }));
}

export async function createEvents(user: CurrentUser, input: z.infer<typeof createEventSchema>): Promise<number> {
  const caseIds = await accessibleCaseIds(user);
  let caseId = input.caseId;
  if (user.role === "parent") {
    caseId = caseIds[0] ?? null;
  }
  if (caseId && !caseIds.includes(caseId)) {
    throw new ApiError(404, "caseNotFound");
  }
  if (!caseId && user.role !== "curator") {
    throw new ApiError(404, "caseNotFound");
  }
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : null;
  if (Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end < start))) {
    throw new ApiError(400, "invalidDate");
  }
  const step = input.repeat === "daily" ? 1 : input.repeat === "weekly" ? 7 : 0;
  const count = step === 0 ? 1 : input.repeatCount;
  const data = Array.from({ length: count }, (_, index) => ({
    caseId,
    ownerId: user.id,
    type: input.type,
    title: input.title,
    startsAt: new Date(start.getTime() + index * step * 86_400_000),
    endsAt: end ? new Date(end.getTime() + index * step * 86_400_000) : null,
    notes: input.notes,
  }));
  await prisma.calendarEvent.createMany({ data });
  return data.length;
}

export async function deleteEvent(user: CurrentUser, id: string): Promise<void> {
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) {
    throw new ApiError(404, "eventNotFound");
  }
  const caseIds = await accessibleCaseIds(user);
  const allowed = event.ownerId === user.id || (user.role === "parent" && event.caseId !== null && caseIds.includes(event.caseId));
  if (!allowed) {
    throw new ApiError(403, "forbidden");
  }
  await prisma.calendarEvent.delete({ where: { id } });
}
