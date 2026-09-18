export const PASSWORD_MASK = "********";

export const DEFAULT_MAIL_HOSTS = {
  imapHost: "imap.kagoya.net",
  imapPort: 993,
  smtpHost: "smtp.kagoya.net",
  smtpPort: 465,
} as const;

export interface MailConfigInput {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
}

export interface MailConfigRecord extends MailConfigInput {
  portalUserId: string;
  passwordEncrypted: string;
  updatedAt: string;
}

export interface MailConfigPublic {
  portalUserId: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  passwordMasked: string;
  hasPassword: boolean;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readPort(value: unknown, fallback: number): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (Number.isInteger(fallback) && fallback > 0) {
    return fallback;
  }
  return null;
}

export function parseMailSettingsActor(
  body: unknown,
  headerUserId: string | null,
  headerEmail: string | null,
  queryUserId: string | null
): { portalUserId: string; email: string } | null {
  const data = isRecord(body) ? body : {};
  const portalUserId =
    readNonEmptyString(headerUserId) ??
    readNonEmptyString(queryUserId) ??
    readNonEmptyString(data.portalUserId);
  if (!portalUserId) {
    return null;
  }
  const email =
    readNonEmptyString(headerEmail) ?? readNonEmptyString(data.email) ?? "";
  return { portalUserId, email };
}

export function parseMailConfigInput(body: unknown): MailConfigInput | null {
  if (!isRecord(body)) {
    return null;
  }
  const imapHost = readNonEmptyString(body.imapHost);
  const smtpHost = readNonEmptyString(body.smtpHost);
  const username = readNonEmptyString(body.username);
  const imapPort = readPort(body.imapPort, DEFAULT_MAIL_HOSTS.imapPort);
  const smtpPort = readPort(body.smtpPort, DEFAULT_MAIL_HOSTS.smtpPort);
  const password =
    typeof body.password === "string" ? body.password : "";
  if (!imapHost || !smtpHost || !username || imapPort === null || smtpPort === null) {
    return null;
  }
  return { imapHost, imapPort, smtpHost, smtpPort, username, password };
}

export function isMaskedOrEmptyPassword(password: string): boolean {
  return password.trim() === "" || password === PASSWORD_MASK;
}

export function toPublicMailConfig(
  portalUserId: string,
  record: Pick<
    MailConfigRecord,
    "imapHost" | "imapPort" | "smtpHost" | "smtpPort" | "username" | "passwordEncrypted" | "updatedAt"
  > | null
): MailConfigPublic {
  if (!record) {
    return {
      portalUserId,
      ...DEFAULT_MAIL_HOSTS,
      username: "",
      passwordMasked: "",
      hasPassword: false,
      updatedAt: "",
    };
  }
  const hasPassword = record.passwordEncrypted.trim() !== "";
  return {
    portalUserId,
    imapHost: record.imapHost,
    imapPort: record.imapPort,
    smtpHost: record.smtpHost,
    smtpPort: record.smtpPort,
    username: record.username,
    passwordMasked: hasPassword ? PASSWORD_MASK : "",
    hasPassword,
    updatedAt: record.updatedAt,
  };
}

export function recordFromItem(item: Record<string, unknown> | null): {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  passwordEncrypted: string;
  updatedAt: string;
} | null {
  if (!item) {
    return null;
  }
  const imapHost = readNonEmptyString(item.imapHost) ?? DEFAULT_MAIL_HOSTS.imapHost;
  const smtpHost = readNonEmptyString(item.smtpHost) ?? DEFAULT_MAIL_HOSTS.smtpHost;
  const username = readNonEmptyString(item.username) ?? "";
  const imapPort = readPort(item.imapPort, DEFAULT_MAIL_HOSTS.imapPort) ?? DEFAULT_MAIL_HOSTS.imapPort;
  const smtpPort = readPort(item.smtpPort, DEFAULT_MAIL_HOSTS.smtpPort) ?? DEFAULT_MAIL_HOSTS.smtpPort;
  const passwordEncrypted = typeof item.passwordEncrypted === "string" ? item.passwordEncrypted : "";
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : "";
  return { imapHost, imapPort, smtpHost, smtpPort, username, passwordEncrypted, updatedAt };
}
