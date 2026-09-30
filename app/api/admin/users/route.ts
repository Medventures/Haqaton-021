import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase().max(160),
  password: z.string().min(8).max(100),
  role: z.enum(["curator", "commission", "moderator", "admin"]),
});

export async function POST(request: Request) {
  try {
    await requireApiUser(["admin"]);
    const body = bodySchema.parse(await readJson(request));
    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      throw new ApiError(409, "emailTaken");
    }
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, role: body.role, passwordHash: await hashPassword(body.password) },
    });
    return NextResponse.json({ ok: true, id: user.id });
  } catch (error) {
    return handleApiError(error);
  }
}
