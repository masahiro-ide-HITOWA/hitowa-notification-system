import {
  isLocalDevHost,
  SAML_LOGIN_PATH,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-mode";
import { resolvePortalUser } from "@/lib/auth-session";
import type { PortalUserProfile } from "@/lib/saml-user-attributes";

export { isLocalDevHost };

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/saml",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/webhook",
  "/api/webhooks",
  "/api/cron",
];

export function isPublicAuthPath(pathname: string): boolean {
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function shouldRedirectUnauthenticated(
  pathname: string,
  hasSession: boolean,
  env: NodeJS.ProcessEnv = process.env,
  hostname?: string
): boolean {
  void env;
  void hostname;
  if (isPublicAuthPath(pathname) || hasSession) {
    return false;
  }
  return true;
}

export function resolveGuardedPortalUser(
  sessionToken: string | undefined | null,
  hostname: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): PortalUserProfile | null {
  void hostname;
  const token = sessionToken?.trim() ?? "";
  if (token === "") {
    return null;
  }
  return resolvePortalUser(token, env);
}

export const PAGE_NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

export function samlLoginRedirectUrl(origin: string): string {
  return new URL(SAML_LOGIN_PATH, origin).toString();
}

export function logAuthGuardCookies(
  cookieList: ReadonlyArray<{ name: string; value: string }>
): void {
  console.log("[AUTH GUARD CHECK]", cookieList);
}

export function hasSessionCookie(
  cookieHeader: string | null,
  cookieName: string = SESSION_COOKIE_NAME
): boolean {
  if (!cookieHeader) {
    return false;
  }
  return cookieHeader.split(";").some((part) => {
    const name = part.trim().split("=")[0];
    const value = part.trim().slice(name.length + 1);
    return name === cookieName && value.trim() !== "";
  });
}
