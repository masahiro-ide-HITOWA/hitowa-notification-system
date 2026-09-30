import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isMockAuthEnabled, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { absoluteUrlFromRequest } from "@/lib/request-origin";
import { sessionCookieOptions, verifySessionToken } from "@/lib/auth-session";

async function attachSessionCookie(
  response: NextResponse,
  token: string,
  request: Request
): Promise<NextResponse> {
  const options = sessionCookieOptions(request);
  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, token, options);
  } catch {
    // Route-handler unit tests have no Next.js cookie store.
  }
  response.cookies.set(SESSION_COOKIE_NAME, token, options);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  if (isMockAuthEnabled()) {
    return NextResponse.json(
      { success: false, message: "モック認証中のため SAML セッション確定は無効です" },
      { status: 400 }
    );
  }

  const ticket = new URL(request.url).searchParams.get("t")?.trim() ?? "";
  if (ticket === "" || !verifySessionToken(ticket)) {
    return NextResponse.json(
      { success: false, message: "セッションチケットが無効です" },
      { status: 401 }
    );
  }

  const response = NextResponse.redirect(absoluteUrlFromRequest("/mypage", request), 303);
  return attachSessionCookie(response, ticket, request);
}
