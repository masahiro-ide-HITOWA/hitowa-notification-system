import { SAML_LOGIN_PATH } from "@/lib/auth-mode";

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

function originFromAbsoluteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function protocolFromForwardedHeaders(
  host: string,
  forwardedProto: string | null
): "http" | "https" {
  const proto = firstHeaderValue(forwardedProto);
  if (proto === "http" || proto === "https") {
    return proto;
  }
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return "http";
  }
  return "https";
}

export function originFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  return originFromAbsoluteUrl(env.SAML_ISSUER) ?? originFromAbsoluteUrl(env.NEXTAUTH_URL);
}

export function resolveRequestOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): string {
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    firstHeaderValue(request.headers.get("host"));
  if (host !== "") {
    return `${protocolFromForwardedHeaders(host, request.headers.get("x-forwarded-proto"))}://${host}`;
  }
  return originFromEnv(env) ?? new URL(request.url).origin;
}

export function absoluteUrlFromRequest(
  path: string,
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): string {
  return new URL(path, `${resolveRequestOrigin(request, env)}/`).toString();
}

export function samlLoginAbsoluteUrl(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): string {
  return absoluteUrlFromRequest(SAML_LOGIN_PATH, request, env);
}
