import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import crypto from "crypto";

const PUBLIC_PATHS = ["/login", "/api/health"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/brand") || pathname === "/favicon.ico") return true;
  return false;
}

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

// Next.js 16 renamed `middleware` to `proxy`; the runtime is always nodejs now, which is what
// lets this hit Postgres directly for a real session check instead of trusting cookie presence.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (pathname === "/login" && token) {
      const valid = await isValidSession(token);
      if (valid) return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const valid = await isValidSession(token);
  if (!valid) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

async function isValidSession(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        select: { expiresAt: true, user: { select: { isActive: true } } },
      });
      if (!session) return false;
      if (session.expiresAt < new Date()) return false;
      if (!session.user.isActive) return false;
      return true;
    } catch (err) {
      // On first attempt, a "connection closed" error means Prisma's pool had
      // a stale socket. Retry once — the pool will establish a fresh connection.
      if (attempt === 0) {
        console.warn("[proxy] DB query failed, retrying once:", err);
        continue;
      }
      console.error("[proxy] Session validation failed after retry:", err);
      return false;
    }
  }

  return false;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
