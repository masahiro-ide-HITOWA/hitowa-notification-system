import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { MailConfigInput } from "@/lib/mail-config";
import {
  MailCredentialsError,
  SAAS_MAIL_SECRET_NAME,
  describeAwsSdkError,
  resolveSecretsManagerRegion,
} from "@/lib/mail-secrets-error";

export {
  MailCredentialsError,
  SAAS_MAIL_SECRET_NAME,
  describeAwsSdkError,
  resolveSecretsManagerRegion,
};

export const MAIL_CREDENTIALS_CACHE_TTL_MS = 8 * 60 * 1000;

export interface MailCredentials {
  email: string;
  password: string;
  host: string;
  port: number;
}

export interface MailCredentialsDeps {
  fetchSecretString?: (secretId: string) => Promise<string>;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  cacheTtlMs?: number;
}

interface CachedMailCredentials {
  value: MailCredentials;
  expiresAt: number;
}

let cachedCredentials: CachedMailCredentials | null = null;
let secretsClient: SecretsManagerClient | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readPort(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  const asString = readNonEmptyString(value);
  if (!asString) {
    return null;
  }
  const parsed = Number(asString);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resetMailCredentialsCache(): void {
  cachedCredentials = null;
  secretsClient = null;
}

export function parseMailCredentialsSecret(raw: string): MailCredentials | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    const email = readNonEmptyString(parsed.email) ?? readNonEmptyString(parsed.username);
    const password = readNonEmptyString(parsed.password);
    const host = readNonEmptyString(parsed.host) ?? readNonEmptyString(parsed.imapHost);
    const port = readPort(parsed.port) ?? readPort(parsed.imapPort);
    if (!email || !password || !host || port === null) {
      return null;
    }
    return { email, password, host, port };
  } catch {
    return null;
  }
}

export function mailCredentialsFromEnv(env: NodeJS.ProcessEnv): MailCredentials | null {
  const email = readNonEmptyString(env.MAIL_EMAIL) ?? readNonEmptyString(env.MAIL_SAAS_EMAIL);
  const password = readNonEmptyString(env.MAIL_PASSWORD) ?? readNonEmptyString(env.MAIL_SAAS_PASSWORD);
  const host =
    readNonEmptyString(env.MAIL_HOST) ??
    readNonEmptyString(env.MAIL_SAAS_HOST) ??
    readNonEmptyString(env.MAIL_IMAP_HOST);
  const port =
    readPort(env.MAIL_PORT) ?? readPort(env.MAIL_SAAS_PORT) ?? readPort(env.MAIL_IMAP_PORT);
  if (!email || !password || !host || port === null) {
    return null;
  }
  return { email, password, host, port };
}

export function toMailConfigInput(credentials: MailCredentials): MailConfigInput {
  return {
    imapHost: credentials.host,
    imapPort: credentials.port,
    smtpHost: credentials.host,
    smtpPort: 587,
    username: credentials.email,
    password: credentials.password,
  };
}

function shouldSkipSecretsManager(env: NodeJS.ProcessEnv, deps: MailCredentialsDeps): boolean {
  if (deps.fetchSecretString) {
    return false;
  }
  if (env.MAIL_CREDENTIALS_SOURCE === "env") {
    return true;
  }
  return env.NODE_ENV === "test" || env.VITEST === "true";
}

async function defaultFetchSecretString(secretId: string): Promise<string> {
  const region = resolveSecretsManagerRegion();
  secretsClient ??= new SecretsManagerClient({ region });
  try {
    const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    const secret = result.SecretString?.trim() ?? "";
    if (secret === "") {
      throw new MailCredentialsError(
        "SecretString is empty",
        describeAwsSdkError(new Error("SecretString is empty"), region)
      );
    }
    return secret;
  } catch (error) {
    if (error instanceof MailCredentialsError) {
      throw error;
    }
    throw new MailCredentialsError(
      "Secrets Manager からの資格情報取得に失敗しました",
      describeAwsSdkError(error, region)
    );
  }
}

export async function getMailCredentials(
  deps: MailCredentialsDeps = {}
): Promise<MailCredentials> {
  const env = deps.env ?? process.env;
  const now = deps.now ? deps.now() : Date.now();
  const ttl = deps.cacheTtlMs ?? MAIL_CREDENTIALS_CACHE_TTL_MS;
  const region = resolveSecretsManagerRegion(env);

  if (cachedCredentials && cachedCredentials.expiresAt > now) {
    return cachedCredentials.value;
  }

  let secretsDetail: string | null = null;
  if (!shouldSkipSecretsManager(env, deps)) {
    try {
      const fetchSecret = deps.fetchSecretString ?? defaultFetchSecretString;
      const parsed = parseMailCredentialsSecret(await fetchSecret(SAAS_MAIL_SECRET_NAME));
      if (parsed) {
        cachedCredentials = { value: parsed, expiresAt: now + ttl };
        return parsed;
      }
      secretsDetail = `region=${region}; secretId=${SAAS_MAIL_SECRET_NAME}; name=InvalidSecretJson; message=email/password/host/port が不足しています`;
      console.error("[mail-secrets] invalid secret JSON", secretsDetail);
    } catch (error) {
      secretsDetail =
        error instanceof MailCredentialsError ? error.detail : describeAwsSdkError(error, region);
      console.error("[mail-secrets] GetSecretValue failed; falling back to env", secretsDetail);
    }
  }

  const fromEnv = mailCredentialsFromEnv(env);
  if (fromEnv) {
    cachedCredentials = { value: fromEnv, expiresAt: now + ttl };
    return fromEnv;
  }

  throw new MailCredentialsError(
    "メール受信用の資格情報を取得できません",
    secretsDetail ??
      `region=${region}; secretId=${SAAS_MAIL_SECRET_NAME}; name=ConfigMissing; message=Secrets Manager と環境変数のどちらからも取得できません`
  );
}
