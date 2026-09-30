import { NextResponse } from "next/server";
import { SAML_LOGIN_PATH, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { sessionCookieOptions } from "@/lib/auth-session";

function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export function GET(request: Request) {
  return clearSession(NextResponse.redirect(new URL(SAML_LOGIN_PATH, request.url)));
}

export function POST() {
  return clearSession(NextResponse.json({ success: true, loginPath: SAML_LOGIN_PATH }));
}
