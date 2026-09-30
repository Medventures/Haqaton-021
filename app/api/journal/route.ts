import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dailyEntrySchema, meltdownSchema, addMeltdown, saveDailyEntry } from "@/lib/journal";
import { requireParentCase } from "@/lib/parent-case";

const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily"), entry: dailyEntrySchema }),
  z.object({ kind: z.literal("meltdown"), entry: meltdownSchema }),
]);

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    const body = requestSchema.parse(await readJson(request));
    if (body.kind === "daily") await saveDailyEntry(record.id, body.entry);
    else await addMeltdown(record.id, body.entry);
    await prisma.case.update({ where: { id: record.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    const { id } = z.object({ id: z.string().min(1) }).parse(await readJson(request));
    const result = await prisma.meltdown.deleteMany({ where: { id, caseId: record.id } });
    if (result.count === 0) throw new ApiError(404, "notFound");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
