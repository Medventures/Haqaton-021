import { NextResponse } from "next/server";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialistProfileSchema } from "@/lib/specialists";

export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(["specialist"]);
    const body = specialistProfileSchema.parse(await readJson(request));
    const profile = await prisma.specialistProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new ApiError(404, "notFound");
    }
    await prisma.specialistProfile.update({
      where: { id: profile.id },
      data: {
        category: body.category,
        city: body.city,
        experienceYears: body.experienceYears,
        aboutRu: body.aboutRu,
        aboutKk: body.aboutKk,
        education: body.education,
        priceKzt: body.priceKzt,
        formats: JSON.stringify(body.formats),
        languages: JSON.stringify(body.languages),
        contact: body.contact,
        status: "pending",
        commissionNote: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    return handleApiError(error);
  }
}
