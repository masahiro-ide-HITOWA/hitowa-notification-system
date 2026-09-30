import { isMockAuthEnabled, SAML_LOGIN_PATH, SESSION_COOKIE_NAME } from "@/lib/auth-mode";

const PUBLIC_PREFIXES = [
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
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (isMockAuthEnabled(env) || isPublicAuthPath(pathname)) {
    return false;
  }
  return !hasSession;
}

export function samlLoginRedirectUrl(origin: string): string {
  return new URL(SAML_LOGIN_PATH, origin).toString();
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
