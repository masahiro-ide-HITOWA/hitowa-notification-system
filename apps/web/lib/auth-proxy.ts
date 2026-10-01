import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import {
  PAGE_NO_CACHE_HEADERS,
  samlLoginRedirectUrl,
  shouldRedirectUnauthenticated,
} from "@/lib/auth-guard";
import { resolveRequestOrigin } from "@/lib/request-origin";

function applyPageNoCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", PAGE_NO_CACHE_HEADERS["Cache-Control"]);
  response.headers.set("Pragma", PAGE_NO_CACHE_HEADERS.Pragma);
  return response;
}

export function runAuthProxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  const hasSession = Boolean(token);
  const hostname = request.nextUrl.hostname;
  if (!shouldRedirectUnauthenticated(request.nextUrl.pathname, hasSession, process.env, hostname)) {
    return applyPageNoCache(NextResponse.next());
  }
  const loginUrl = samlLoginRedirectUrl(resolveRequestOrigin(request));
  return applyPageNoCache(NextResponse.redirect(loginUrl, 302));
}
