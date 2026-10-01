import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { samlLoginRedirectUrl, shouldRedirectUnauthenticated } from "@/lib/auth-guard";
import { resolveRequestOrigin } from "@/lib/request-origin";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  const hasSession = Boolean(token);
  const hostname = request.nextUrl.hostname;
  if (!shouldRedirectUnauthenticated(request.nextUrl.pathname, hasSession, process.env, hostname)) {
    return NextResponse.next();
  }
  const loginUrl = samlLoginRedirectUrl(resolveRequestOrigin(request));
  return NextResponse.redirect(loginUrl, 302);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
