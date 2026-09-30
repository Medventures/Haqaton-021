import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { deleteEvent } from "@/lib/calendar";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator"]);
    await deleteEvent(user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
