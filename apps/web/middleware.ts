import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { samlLoginRedirectUrl, shouldRedirectUnauthenticated } from "@/lib/auth-guard";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!shouldRedirectUnauthenticated(request.nextUrl.pathname, hasSession)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(samlLoginRedirectUrl(request.nextUrl.origin));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
