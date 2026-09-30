import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { toInterviewState, undoLastAnswer } from "@/lib/interview/engine";
import { requireParentCase } from "@/lib/parent-case";

export async function POST() {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    const updated = await undoLastAnswer(record.id);
    return NextResponse.json(await toInterviewState(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
