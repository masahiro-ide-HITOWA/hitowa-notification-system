import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SAML_LOGIN_PATH, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { samlLoginAbsoluteUrl } from "@/lib/request-origin";
import { LOGOUT_CACHE_HEADERS, sessionCookieClearOptions } from "@/lib/auth-session";

function applyLogoutHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", LOGOUT_CACHE_HEADERS["Cache-Control"]);
  response.headers.set("Pragma", LOGOUT_CACHE_HEADERS.Pragma);
  response.headers.set("Expires", LOGOUT_CACHE_HEADERS.Expires);
  return response;
}

async function clearSessionCookie(response: NextResponse, request: Request): Promise<NextResponse> {
  const clear = sessionCookieClearOptions(request);
  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, "", clear);
    jar.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  } catch {
    // Route-handler unit tests have no Next.js cookie store.
  }
  response.cookies.set(SESSION_COOKIE_NAME, "", clear);
  response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  return applyLogoutHeaders(response);
}

export async function GET(request: Request) {
  return clearSessionCookie(NextResponse.redirect(samlLoginAbsoluteUrl(request)), request);
}

export async function POST(request: Request) {
  return clearSessionCookie(
    NextResponse.json({
      success: true,
      loginPath: SAML_LOGIN_PATH,
      loginUrl: samlLoginAbsoluteUrl(request),
    }),
    request
  );
}
