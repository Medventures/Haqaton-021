import { z } from "zod";
import { ApiError, clientMeta, handleApiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/server";
import { LEGAL_VERSION } from "@/lib/legal";
import { sessionResponse } from "@/lib/login";
import { hashPassword } from "@/lib/password";
import { specialistProfileSchema } from "@/lib/specialists";

const baseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase().max(160),
  password: z.string().min(8).max(100),
  phone: z.string().trim().max(30).optional(),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
});

const bodySchema = z.discriminatedUnion("role", [
  baseSchema.extend({
    role: z.literal("parent"),
    childName: z.string().trim().min(1).max(60),
    legalRepresentative: z.literal(true),
  }),
  baseSchema.extend({
    role: z.literal("specialist"),
    accurateInfo: z.literal(true),
    profile: specialistProfileSchema,
  }),
]);

export async function POST(request: Request) {
  try {
    const raw = await readJson(request);
    const consentCheck = z
      .object({ acceptTerms: z.literal(true), acceptPrivacy: z.literal(true) })
      .safeParse(raw);
    if (!consentCheck.success) {
      throw new ApiError(400, "consentRequired");
    }
    const body = bodySchema.parse(raw);
    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      throw new ApiError(409, "emailTaken");
    }
    const locale = await getLocale();
    const meta = clientMeta(request);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        phone: body.phone || null,
        role: body.role,
        locale: isLocale(locale) ? locale : "ru",
        passwordHash: await hashPassword(body.password),
      },
    });
    await prisma.consent.createMany({
      data: ["terms", "privacy"].map((document) => ({
        userId: user.id,
        document,
        version: LEGAL_VERSION,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })),
    });
    if (body.role === "parent") {
      await prisma.case.create({ data: { parentId: user.id, childName: body.childName, status: "interview" } });
    } else {
      const profile = body.profile;
      await prisma.specialistProfile.create({
        data: {
          userId: user.id,
          category: profile.category,
          city: profile.city,
          experienceYears: profile.experienceYears,
          aboutRu: profile.aboutRu,
          aboutKk: profile.aboutKk,
          education: profile.education,
          priceKzt: profile.priceKzt,
          formats: JSON.stringify(profile.formats),
          languages: JSON.stringify(profile.languages),
          contact: profile.contact,
          status: "pending",
        },
      });
    }
    return sessionResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
