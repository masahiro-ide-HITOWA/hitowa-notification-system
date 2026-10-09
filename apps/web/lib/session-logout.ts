import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { LOGOUT_CACHE_HEADERS, isSecureSessionCookie } from "@/lib/auth-session";
import { cookieDomainFromEnv } from "@/lib/deploy-env";
import { absoluteUrlFromRequest } from "@/lib/request-origin";

const LOGGED_OUT_PATH = "/login?logged_out=true";

export function clearSessionCookieHeader(domain: string | undefined, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  return parts.join("; ");
}

export function appendClearedSessionCookies(response: NextResponse, request: Request): void {
  const domain = cookieDomainFromEnv();
  const secure = isSecureSessionCookie(request);
  if (domain) {
    response.headers.append("Set-Cookie", clearSessionCookieHeader(domain, secure));
  }
  response.headers.append("Set-Cookie", clearSessionCookieHeader(undefined, secure));
}

export function loggedOutUrl(request: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (appUrl !== "") {
    return new URL(LOGGED_OUT_PATH, appUrl).toString();
  }
  return absoluteUrlFromRequest(LOGGED_OUT_PATH, request);
}

export function sloRedirectUrl(request: Request): string {
  const idpLogout = process.env.SAML_SLO_URL?.trim() ?? "";
  if (idpLogout !== "") {
    return idpLogout;
  }
  console.info("[saml] SAML_SLO_URL is not set; clearing the local session only");
  return loggedOutUrl(request);
}

export function clearedSessionRedirect(request: Request, location: string): NextResponse {
  const response = NextResponse.redirect(location, 302);
  appendClearedSessionCookies(response, request);
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", LOGOUT_CACHE_HEADERS.Pragma);
  response.headers.set("Expires", LOGOUT_CACHE_HEADERS.Expires);
  return response;
}
