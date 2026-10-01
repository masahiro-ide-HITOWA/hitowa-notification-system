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

export function isLocalDevHost(hostname: string | undefined): boolean {
  const host = hostname?.split(":")[0] ?? "";
  return host === "localhost" || host === "127.0.0.1";
}

export function shouldRedirectUnauthenticated(
  pathname: string,
  hasSession: boolean,
  env: NodeJS.ProcessEnv = process.env,
  hostname?: string
): boolean {
  if (isPublicAuthPath(pathname) || hasSession) {
    return false;
  }
  if (isMockAuthEnabled(env) && isLocalDevHost(hostname)) {
    return false;
  }
  return true;
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
