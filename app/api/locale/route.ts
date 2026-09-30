import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LOCALES, LOCALE_COOKIE } from "@/lib/i18n/locale";

const bodySchema = z.object({ locale: z.enum(LOCALES) });

export async function POST(request: Request) {
  try {
    const { locale } = bodySchema.parse(await readJson(request));
    const user = await getCurrentUser();
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { locale } });
    }
    const response = NextResponse.json({ ok: true, locale });
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
