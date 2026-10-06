import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { LOGOUT_CACHE_HEADERS } from "@/lib/auth-session";

const DEFAULT_SAML_ENTRY_POINT = "https://stg-auth.hitowa.com/saml2/sso";

export function samlEntryPointUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.SAML_ENTRY_POINT?.trim() ?? "";
  return configured !== "" ? configured : DEFAULT_SAML_ENTRY_POINT;
}

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

export async function GET() {
  const response = NextResponse.redirect(samlEntryPointUrl(), 302);
  return clearSessionCookie(response);
}

export async function POST() {
  const response = NextResponse.redirect(samlEntryPointUrl(), 302);
  return clearSessionCookie(response);
}
