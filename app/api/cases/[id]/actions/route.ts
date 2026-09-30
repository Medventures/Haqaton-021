import { NextResponse } from "next/server";
import { handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { applyCaseAction, caseActionSchema } from "@/lib/plan/mutations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator"]);
    const action = caseActionSchema.parse(await readJson(request));
    const updated = await applyCaseAction(id, user, action);
    return NextResponse.json({ status: updated.status, plan: updated.plan });
  } catch (error) {
    return handleApiError(error);
  }
}
