import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDictionary, type ErrorKey } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public key: ErrorKey,
  ) {
    super(key);
  }
}

export async function handleApiError(error: unknown): Promise<NextResponse> {
  const t = getDictionary(await getLocale());
  if (error instanceof ApiError) {
    return NextResponse.json({ error: t.errors[error.key], code: error.key }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: t.errors.badRequest, issues: error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: t.errors.server }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "jsonExpected");
  }
}

export function clientMeta(request: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ip: forwarded ? forwarded.split(",")[0].trim() : null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}
