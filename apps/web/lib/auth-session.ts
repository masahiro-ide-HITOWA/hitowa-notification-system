import { createHmac, timingSafeEqual } from "node:crypto";
import type { PortalUserProfile } from "@/lib/saml-user-attributes";
import { SESSION_COOKIE_NAME } from "@/lib/auth-mode";

export { SESSION_COOKIE_NAME };
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

interface SessionPayload {
  portalUserId: string;
  email: string;
  name: string;
  divisionName: string;
  exp: number;
}

function sessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  return env.SESSION_SECRET?.trim() || env.SAML_ISSUER?.trim() || "hitowa-dev-session-secret";
}

function sign(value: string, env: NodeJS.ProcessEnv = process.env): string {
  return createHmac("sha256", sessionSecret(env)).update(value).digest("base64url");
}

export function createSessionToken(
  user: PortalUserProfile,
  nowMs: number = Date.now(),
  env: NodeJS.ProcessEnv = process.env
): string {
  const payload: SessionPayload = {
    portalUserId: user.portalUserId,
    email: user.email,
    name: user.name,
    divisionName: user.divisionName,
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, env)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now(),
  env: NodeJS.ProcessEnv = process.env
): PortalUserProfile | null {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = sign(encoded, env);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("portalUserId" in parsed) ||
      !("email" in parsed) ||
      !("name" in parsed) ||
      !("divisionName" in parsed) ||
      !("exp" in parsed)
    ) {
      return null;
    }
    const payload = parsed as SessionPayload;
    if (payload.exp * 1000 <= nowMs) {
      return null;
    }
    return {
      portalUserId: payload.portalUserId,
      email: payload.email,
      name: payload.name,
      divisionName: payload.divisionName,
      companyCode: "",
      companyName: "",
      officeCode: "",
      positionCode: "",
      employmentCode: "",
    };
  } catch {
    return null;
  }
}

export function resolvePortalUser(
  sessionToken: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
  hostname?: string
): PortalUserProfile | null {
  void hostname;
  const token = sessionToken?.trim();
  if (!token) {
    return null;
  }
  return verifySessionToken(token, Date.now(), env);
}

export function sessionCookieFromHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return undefined;
}

export function isSecureSessionCookie(
  request?: Request,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NODE_ENV === "production") {
    return true;
  }
  if (!request) {
    return false;
  }
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto === "https") {
    return true;
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export type SessionCookieSetOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  path: "/";
  maxAge: number;
};

export function sessionCookieOptions(
  request?: Request,
  env: NodeJS.ProcessEnv = process.env
): SessionCookieSetOptions {
  const secure = isSecureSessionCookie(request, env);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export type SessionCookieClearOptions = SessionCookieSetOptions & {
  maxAge: 0;
  expires: Date;
};

export function sessionCookieClearOptions(
  request?: Request,
  env: NodeJS.ProcessEnv = process.env
): SessionCookieClearOptions {
  const options = sessionCookieOptions(request, env);
  return {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  };
}

export const LOGOUT_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;
