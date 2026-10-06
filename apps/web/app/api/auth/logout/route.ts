import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SAML_LOGIN_PATH, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { samlLoginAbsoluteUrl } from "@/lib/request-origin";
import { LOGOUT_CACHE_HEADERS } from "@/lib/auth-session";

const CLEAR_SESSION_COOKIE = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 0,
  expires: new Date(0),
};

function applyLogoutHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", LOGOUT_CACHE_HEADERS["Cache-Control"]);
  response.headers.set("Pragma", LOGOUT_CACHE_HEADERS.Pragma);
  response.headers.set("Expires", LOGOUT_CACHE_HEADERS.Expires);
  return response;
}

async function clearSessionCookie(response: NextResponse): Promise<NextResponse> {
  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, "", CLEAR_SESSION_COOKIE);
  } catch {
    // Route-handler unit tests have no Next.js cookie store.
  }
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...CLEAR_SESSION_COOKIE,
  });
  return applyLogoutHeaders(response);
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(samlLoginAbsoluteUrl(request), 302);
  return clearSessionCookie(response);
}

export async function POST(request: Request) {
  return clearSessionCookie(
    NextResponse.json({
      success: true,
      loginPath: SAML_LOGIN_PATH,
      loginUrl: samlLoginAbsoluteUrl(request),
    })
  );
}
