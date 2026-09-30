import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n/server";
import { toSpecialistCard } from "@/lib/specialists";

export async function GET() {
  try {
    const locale = await getLocale();
    const profiles = await prisma.specialistProfile.findMany({
      where: { status: "approved", user: { status: "active" } },
      include: { user: { select: { name: true } }, reviews: { select: { rating: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      specialists: profiles.map((profile) => {
        const card = toSpecialistCard(profile, locale);
        return { ...card, contact: undefined };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
