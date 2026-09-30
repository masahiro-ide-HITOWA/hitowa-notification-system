import "server-only";
import { SAML } from "@node-saml/node-saml";
import { isMockAuthEnabled } from "@/lib/auth-mode";

export { isMockAuthEnabled };
export {
  SAML_CALLBACK_PATH,
  SAML_LOGIN_PATH,
  SAML_METADATA_PATH,
} from "@/lib/auth-mode";
export {
  absoluteUrlFromRequest,
  resolveRequestOrigin,
  samlLoginAbsoluteUrl,
} from "@/lib/request-origin";

export interface SamlEnvConfig {
  entryPoint: string;
  idpIssuer: string;
  idpCert: string;
  issuer: string;
  callbackUrl: string;
}

export interface SamlClientLike {
  getAuthorizeUrlAsync: (
    relayState: string,
    host: string | undefined,
    options: Record<string, unknown>
  ) => Promise<string>;
  validatePostResponseAsync: (
    body: Record<string, string>
  ) => Promise<{ profile: Record<string, unknown> | null }>;
  generateServiceProviderMetadata: (decryptionCert: string | null) => string;
}

export function normalizeSamlCertificate(raw: string): string {
  const withNewlines = raw.replace(/\\n/g, "\n").trim();
  if (withNewlines.includes("BEGIN CERTIFICATE")) {
    return withNewlines;
  }
  const body = withNewlines.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
}

export function readSamlEnv(env: NodeJS.ProcessEnv = process.env): SamlEnvConfig | null {
  const entryPoint = env.SAML_ENTRY_POINT?.trim() ?? "";
  const idpIssuer = env.SAML_IDP_ISSUER?.trim() ?? "";
  const cert = env.SAML_CERT?.trim() ?? "";
  const issuer = env.SAML_ISSUER?.trim() ?? "";
  const callbackUrl = env.SAML_CALLBACK_URL?.trim() ?? "";
  if (!entryPoint || !idpIssuer || !cert || !issuer || !callbackUrl) {
    return null;
  }
  return {
    entryPoint,
    idpIssuer,
    idpCert: normalizeSamlCertificate(cert),
    issuer,
    callbackUrl,
  };
}

export function createSamlClient(config: SamlEnvConfig): SamlClientLike {
  return new SAML({
    entryPoint: config.entryPoint,
    idpIssuer: config.idpIssuer,
    idpCert: config.idpCert,
    issuer: config.issuer,
    callbackUrl: config.callbackUrl,
    audience: config.issuer,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    forceAuthn: true,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  }) as unknown as SamlClientLike;
}

export function getSamlClient(env: NodeJS.ProcessEnv = process.env): SamlClientLike {
  const config = readSamlEnv(env);
  if (!config) {
    throw new Error("SAML 環境変数が不足しています");
  }
  return createSamlClient(config);
}
