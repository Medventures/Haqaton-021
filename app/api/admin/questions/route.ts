import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { questionOptionSchema } from "@/lib/interview/questions";

const bodySchema = z.object({
  kind: z.enum(["single", "multi", "text"]),
  required: z.boolean(),
  questionRu: z.string().trim().min(3).max(300),
  questionKk: z.string().trim().min(3).max(300),
  options: z.array(questionOptionSchema.omit({ value: true })).max(8),
});

export async function POST(request: Request) {
  try {
    await requireApiUser(["admin"]);
    const body = bodySchema.parse(await readJson(request));
    const last = await prisma.interviewQuestion.findFirst({ orderBy: { sortOrder: "desc" } });
    const id = `custom_${randomBytes(4).toString("hex")}`;
    await prisma.interviewQuestion.create({
      data: {
        id,
        builtIn: false,
        kind: body.kind,
        required: body.required,
        active: true,
        sortOrder: (last?.sortOrder ?? 0) + 10,
        questionRu: body.questionRu,
        questionKk: body.questionKk,
        options: JSON.stringify(
          body.kind === "text" ? [] : body.options.map((option, index) => ({ value: `opt${index + 1}`, ...option })),
        ),
      },
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
