import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { LOGOUT_CACHE_HEADERS } from "@/lib/auth-session";
import { absoluteUrlFromRequest } from "@/lib/request-origin";

const FALLBACK_COOKIE_HOST = "main.d17na73qopyazf.amplifyapp.com";
const LOGGED_OUT_PATH = "/login?logged_out=true";

function cookieDomain(request: NextRequest): string {
  const fromEnv = process.env.COOKIE_DOMAIN?.trim() ?? "";
  let requestHost = "";
  try {
    requestHost = new URL(request.url).host;
  } catch {
    requestHost = "";
  }
  const host =
    fromEnv ||
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    requestHost ||
    FALLBACK_COOKIE_HOST;
  return host.split(":")[0] || FALLBACK_COOKIE_HOST;
}

function clearCookieHeader(domain?: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  return parts.join("; ");
}

function logoutRedirectUrl(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (appUrl !== "") {
    return new URL(LOGGED_OUT_PATH, appUrl).toString();
  }
  return absoluteUrlFromRequest(LOGGED_OUT_PATH, request);
}

async function logoutResponse(request: NextRequest): Promise<NextResponse> {
  const domain = cookieDomain(request);
  const response = NextResponse.redirect(logoutRedirectUrl(request), 302);
  response.headers.append("Set-Cookie", clearCookieHeader(domain));
  response.headers.append("Set-Cookie", clearCookieHeader());
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", LOGOUT_CACHE_HEADERS.Pragma);
  response.headers.set("Expires", LOGOUT_CACHE_HEADERS.Expires);
  return response;
}

export async function GET(request: NextRequest) {
  return logoutResponse(request);
}

export async function POST(request: NextRequest) {
  return logoutResponse(request);
}
