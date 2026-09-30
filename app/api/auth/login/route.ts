import { z } from "zod";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sessionResponse } from "@/lib/login";
import { verifyPassword } from "@/lib/password";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(160),
  password: z.string().max(100),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "invalidCredentials");
    }
    if (user.status !== "active") {
      throw new ApiError(403, "blocked");
    }
    return sessionResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
