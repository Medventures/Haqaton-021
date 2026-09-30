import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireApiUser(["admin"]);
    const { direction } = bodySchema.parse(await readJson(request));
    const questions = await prisma.interviewQuestion.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    const index = questions.findIndex((question) => question.id === id);
    if (index === -1) {
      throw new ApiError(404, "notFound");
    }
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) {
      return NextResponse.json({ ok: true });
    }
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await prisma.$transaction(
      reordered.map((question, position) =>
        prisma.interviewQuestion.update({ where: { id: question.id }, data: { sortOrder: (position + 1) * 10 } }),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
