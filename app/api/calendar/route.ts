import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createEventSchema, createEvents, listEvents } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(["parent", "curator"]);
    const params = request.nextUrl.searchParams;
    const from = new Date(params.get("from") ?? "");
    const to = new Date(params.get("to") ?? "");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new ApiError(400, "invalidDate");
    }
    return NextResponse.json({ events: await listEvents(user, from, to, params.get("caseId")) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent", "curator"]);
    const body = createEventSchema.parse(await readJson(request));
    const created = await createEvents(user, body);
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return handleApiError(error);
  }
}
