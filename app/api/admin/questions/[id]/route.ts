import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { questionOptionSchema } from "@/lib/interview/questions";
import { getBuiltInSlot } from "@/lib/interview/slots";

const bodySchema = z.object({
  questionRu: z.string().trim().min(3).max(300).optional(),
  questionKk: z.string().trim().min(3).max(300).optional(),
  active: z.boolean().optional(),
  required: z.boolean().optional(),
  options: z.array(questionOptionSchema).max(8).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireApiUser(["admin"]);
    const body = bodySchema.parse(await readJson(request));
    const question = await prisma.interviewQuestion.findUnique({ where: { id } });
    if (!question) {
      throw new ApiError(404, "notFound");
    }
    const builtIn = getBuiltInSlot(id);
    if (builtIn?.required && body.active === false) {
      throw new ApiError(400, "requiredLocked");
    }
    let options = body.options;
    if (options && builtIn) {
      const allowed = new Set(builtIn.options.map((option) => option.value));
      options = options.filter((option) => allowed.has(option.value));
    }
    await prisma.interviewQuestion.update({
      where: { id },
      data: {
        questionRu: body.questionRu,
        questionKk: body.questionKk,
        active: body.active,
        required: builtIn ? undefined : body.required,
        options: options ? JSON.stringify(options) : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireApiUser(["admin"]);
    if (getBuiltInSlot(id)) {
      throw new ApiError(400, "builtInQuestion");
    }
    await prisma.interviewQuestion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
