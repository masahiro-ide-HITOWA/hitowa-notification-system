import { cookieDomainFromEnv, portalOriginFromEnv } from "@/lib/deploy-env";

export const REQUIRED_PRODUCTION_ENV = [
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "COOKIE_DOMAIN",
  "PORTAL_ORIGIN",
  "SAML_ENTRY_POINT",
  "SAML_IDP_ISSUER",
  "SAML_CERT",
  "SAML_ISSUER",
  "SAML_CALLBACK_URL",
] as const;

export function missingRequiredEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return REQUIRED_PRODUCTION_ENV.filter((key) => (env[key]?.trim() ?? "") === "");
}

export function assertRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") {
    return;
  }
  if (cookieDomainFromEnv(env) === undefined) {
    throw new Error("COOKIE_DOMAIN is not set");
  }
  if (portalOriginFromEnv(env) === undefined) {
    throw new Error("PORTAL_ORIGIN is not set");
  }
  const missing = missingRequiredEnv(env);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
