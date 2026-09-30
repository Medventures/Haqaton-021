import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { ensureInterviewStarted, toInterviewState } from "@/lib/interview/engine";
import { requireParentCase } from "@/lib/parent-case";

export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await ensureInterviewStarted(await requireParentCase(user), await getLocale());
    return NextResponse.json(await toInterviewState(record));
  } catch (error) {
    return handleApiError(error);
  }
}
