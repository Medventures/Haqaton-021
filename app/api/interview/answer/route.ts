import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { answerInterview, toInterviewState } from "@/lib/interview/engine";
import { requireParentCase } from "@/lib/parent-case";

export const maxDuration = 60;

const bodySchema = z.object({
  slot: z.string().min(1).max(60),
  values: z.array(z.string().max(100)).max(10).optional(),
  text: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const body = bodySchema.parse(await readJson(request));
    const record = await requireParentCase(user);
    const updated = await answerInterview(record.id, body, await getLocale());
    return NextResponse.json(await toInterviewState(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
