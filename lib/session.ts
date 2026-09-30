import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "aqyl_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export const ROLES = ["parent", "curator", "specialist", "commission", "admin", "moderator"] as const;

export type Role = (typeof ROLES)[number];

export type Session = {
  uid: string;
  role: Role;
  name: string;
};

const FALLBACK_SECRET = "aqylroute-local-secret-please-set-SESSION_SECRET";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  return new TextEncoder().encode(secret && secret.length >= 16 ? secret : FALLBACK_SECRET);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || !isRole(payload.role)) {
      return null;
    }
    return { uid: payload.sub, role: payload.role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

const CABINETS: Record<Role, string> = {
  parent: "/parent",
  curator: "/curator",
  specialist: "/specialist",
  commission: "/commission",
  admin: "/admin",
  moderator: "/moderator",
};

export function cabinetPath(role: Role): string {
  return CABINETS[role];
}

export function roleForPath(pathname: string): Role | null {
  const segment = pathname.split("/")[1] ?? "";
  const match = (Object.entries(CABINETS) as [Role, string][]).find(([, path]) => path === `/${segment}`);
  return match ? match[0] : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
