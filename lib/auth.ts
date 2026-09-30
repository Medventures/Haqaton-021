import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, cabinetPath, isRole, verifySession, type Role } from "@/lib/session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function toCurrentUser(user: User): CurrentUser | null {
  if (!isRole(user.role) || user.status !== "active") {
    return null;
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  return user ? toCurrentUser(user) : null;
}

export async function requirePageUser(role: Role): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  const current = user ? toCurrentUser(user) : null;
  if (!current) {
    redirect("/api/auth/logout");
  }
  if (current.role !== role) {
    redirect(cabinetPath(current.role));
  }
  return current;
}

export async function requireApiUser(roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "unauthorized");
  }
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "forbidden");
  }
  return user;
}
