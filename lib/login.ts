import type { User } from "@prisma/client";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";
import { SESSION_COOKIE, cabinetPath, isRole, sessionCookieOptions, signSession } from "@/lib/session";

export async function sessionResponse(user: User, body?: Record<string, unknown>): Promise<NextResponse> {
  const role = isRole(user.role) ? user.role : "parent";
  const token = await signSession({ uid: user.id, role, name: user.name });
  const response = NextResponse.json({ ok: true, redirect: cabinetPath(role), ...body });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  if (isLocale(user.locale)) {
    response.cookies.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}
