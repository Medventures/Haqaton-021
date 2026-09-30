import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({ status: z.enum(["active", "blocked"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = await requireApiUser(["admin"]);
    const body = bodySchema.parse(await readJson(request));
    if (id === admin.id) {
      throw new ApiError(400, "selfBlock");
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      throw new ApiError(404, "notFound");
    }
    await prisma.user.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
