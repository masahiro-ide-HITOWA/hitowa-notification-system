import { NextResponse } from "next/server";
import { resolvePortalUser, sessionCookieFromHeader } from "@/lib/auth-session";
import { isMockAuthEnabled } from "@/lib/auth-mode";

export async function GET(request: Request) {
  const token = sessionCookieFromHeader(request.headers.get("cookie"));
  const user = resolvePortalUser(token);
  return NextResponse.json({
    success: true,
    authMode: isMockAuthEnabled() ? "mock" : "saml",
    user,
  });
}
