export const SAML_LOGIN_PATH = "/api/auth/saml/login";
export const SAML_CALLBACK_PATH = "/api/auth/saml/callback";
export const SAML_COMPLETE_PATH = "/api/auth/saml/complete";
export const SAML_METADATA_PATH = "/api/auth/saml/metadata";
export const SESSION_COOKIE_NAME = "hitowa_session";

type HeaderReader = { get(name: string): string | null };

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

export function isLocalDevHost(hostname: string | undefined): boolean {
  const host = hostname?.split(":")[0]?.trim().toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1";
}

function preferredHostname(candidates: string[]): string {
  const present = candidates.filter((value) => value !== "");
  const remote = present.find((value) => !isLocalDevHost(value));
  return remote ?? present[0] ?? "";
}

export function hostnameFromHeaders(source: HeaderReader): string {
  return preferredHostname([
    firstHeaderValue(source.get("x-forwarded-host")),
    firstHeaderValue(source.get("host")),
  ]);
}

export function hostnameFromRequest(request: Request): string {
  let urlHost = "";
  try {
    urlHost = new URL(request.url).host;
  } catch {
    urlHost = "";
  }
  return preferredHostname([
    firstHeaderValue(request.headers.get("x-forwarded-host")),
    firstHeaderValue(request.headers.get("host")),
    urlHost,
  ]);
}

export function isMockAuthEnabled(
  _env: NodeJS.ProcessEnv = process.env,
  _hostname?: string
): boolean {
  return false;
}
