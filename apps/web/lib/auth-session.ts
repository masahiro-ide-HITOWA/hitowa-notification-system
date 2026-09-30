import { createHmac, timingSafeEqual } from "node:crypto";
import type { PortalUserProfile } from "@/lib/saml-user-attributes";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";
import { isMockAuthEnabled, SESSION_COOKIE_NAME } from "@/lib/auth-mode";

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
      ...DEMO_USER_PROFILE,
      portalUserId: payload.portalUserId,
      email: payload.email,
      name: payload.name,
      divisionName: payload.divisionName,
    };
  } catch {
    return null;
  }
}

export function resolvePortalUser(
  sessionToken: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env
): PortalUserProfile | null {
  if (isMockAuthEnabled(env)) {
    return DEMO_USER_PROFILE;
  }
  return verifySessionToken(sessionToken, Date.now(), env);
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

export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
