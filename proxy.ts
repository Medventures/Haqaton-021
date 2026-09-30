import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, cabinetPath, roleForPath, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const requiredRole = roleForPath(request.nextUrl.pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(cabinetPath(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/parent/:path*",
    "/curator/:path*",
    "/specialist",
    "/specialist/:path*",
    "/commission/:path*",
    "/admin/:path*",
    "/moderator/:path*",
  ],
};
