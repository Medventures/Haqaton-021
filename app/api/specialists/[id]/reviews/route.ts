import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10).max(1500),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent"]);
    const body = bodySchema.parse(await readJson(request));
    const profile = await prisma.specialistProfile.findUnique({ where: { id }, select: { status: true } });
    if (!profile) {
      throw new ApiError(404, "notFound");
    }
    if (profile.status !== "approved") {
      throw new ApiError(409, "specialistNotApproved");
    }
    const review = await prisma.review.upsert({
      where: { specialistId_authorId: { specialistId: id, authorId: user.id } },
      update: { rating: body.rating, text: body.text, status: "pending", moderatorId: null, moderatedAt: null, moderationNote: null },
      create: { specialistId: id, authorId: user.id, rating: body.rating, text: body.text, status: "pending" },
    });
    return NextResponse.json({ ok: true, review: { id: review.id, status: review.status } });
  } catch (error) {
    return handleApiError(error);
  }
}
