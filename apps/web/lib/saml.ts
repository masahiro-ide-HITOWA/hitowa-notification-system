import "server-only";
import { SAML } from "@node-saml/node-saml";
import { isMockAuthEnabled } from "@/lib/auth-mode";

export { isMockAuthEnabled };
export {
  SAML_CALLBACK_PATH,
  SAML_COMPLETE_PATH,
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

export function formatCertificate(cert: string): string {
  if (!cert) {
    return "";
  }
  const cleanCert = cert
    .replace(/\\n/g, "")
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const formatted = cleanCert.match(/.{1,64}/g)?.join("\n") || cleanCert;
  return `-----BEGIN CERTIFICATE-----\n${formatted}\n-----END CERTIFICATE-----`;
}

export function normalizeSamlCertificate(raw: string): string {
  return formatCertificate(raw);
}

const REQUIRED_SAML_ENV_KEYS = [
  "SAML_ENTRY_POINT",
  "SAML_IDP_ISSUER",
  "SAML_CERT",
  "SAML_ISSUER",
  "SAML_CALLBACK_URL",
] as const;

export type SamlEnvKey = (typeof REQUIRED_SAML_ENV_KEYS)[number];

export function missingSamlEnvKeys(env: NodeJS.ProcessEnv = process.env): SamlEnvKey[] {
  return REQUIRED_SAML_ENV_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });
}

export class MissingSamlEnvError extends Error {
  readonly missingKeys: SamlEnvKey[];

  constructor(missingKeys: SamlEnvKey[]) {
    super("SAML 環境変数が不足しています");
    this.name = "MissingSamlEnvError";
    this.missingKeys = missingKeys;
  }
}

export function readSamlEnv(env: NodeJS.ProcessEnv = process.env): SamlEnvConfig | null {
  if (missingSamlEnvKeys(env).length > 0) {
    return null;
  }
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
  const formattedCert = formatCertificate(config.idpCert);
  const options = {
    entryPoint: config.entryPoint,
    idpIssuer: config.idpIssuer,
    cert: formattedCert,
    idpCert: formattedCert,
    issuer: config.issuer,
    callbackUrl: config.callbackUrl,
    audience: config.issuer,
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    signatureAlgorithm: "sha256" as const,
    forceAuthn: true,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  };
  return new SAML(options as unknown as ConstructorParameters<typeof SAML>[0]) as unknown as SamlClientLike;
}

export function getSamlClient(env: NodeJS.ProcessEnv = process.env): SamlClientLike {
  const missingKeys = missingSamlEnvKeys(env);
  if (missingKeys.length > 0) {
    throw new MissingSamlEnvError(missingKeys);
  }
  const config = readSamlEnv(env);
  if (!config) {
    throw new MissingSamlEnvError(missingSamlEnvKeys(env));
  }
  return createSamlClient(config);
}
