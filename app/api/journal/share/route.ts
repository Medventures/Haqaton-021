import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireParentCase } from "@/lib/parent-case";

const schema = z.object({ specialistId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    const { specialistId } = schema.parse(await readJson(request));
    const specialist = await prisma.user.findFirst({
      where: { id: specialistId, role: "specialist", status: "active", specialistProfile: { status: "approved" } },
      select: { id: true },
    });
    if (!specialist) throw new ApiError(404, "notFound");
    await prisma.caseSpecialistAccess.upsert({
      where: { caseId_specialistId: { caseId: record.id, specialistId } },
      update: {},
      create: { caseId: record.id, specialistId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    const { specialistId } = schema.parse(await readJson(request));
    await prisma.caseSpecialistAccess.deleteMany({ where: { caseId: record.id, specialistId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
