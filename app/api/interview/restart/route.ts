import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { saveCase } from "@/lib/cases";
import { requireParentCase } from "@/lib/parent-case";

export async function POST() {
  try {
    const user = await requireApiUser(["parent"]);
    const record = await requireParentCase(user);
    if (record.curatorId) {
      throw new ApiError(403, "curatorManages");
    }
    await saveCase(record.id, { status: "interview", facts: {}, interview: [], plan: null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
