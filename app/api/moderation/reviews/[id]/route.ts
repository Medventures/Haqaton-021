import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["moderator"]);
    const body = bodySchema.parse(await readJson(request));
    if (body.decision === "rejected" && !body.note) {
      throw new ApiError(400, "noteRequired");
    }
    const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) {
      throw new ApiError(404, "notFound");
    }
    await prisma.review.update({
      where: { id },
      data: { status: body.decision, moderatorId: user.id, moderatedAt: new Date(), moderationNote: body.note || null },
    });
    return NextResponse.json({ ok: true, status: body.decision });
  } catch (error) {
    return handleApiError(error);
  }
}
