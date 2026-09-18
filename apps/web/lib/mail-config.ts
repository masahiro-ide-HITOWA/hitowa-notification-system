import { MAIL_SERVER_DEFAULTS } from "@/lib/mail-config-defaults";

export const PASSWORD_MASK = "********";
export const PASSWORD_KEEP_PLACEHOLDER = "••••••••（変更しない場合は空欄のまま）";
export const DEFAULT_MAIL_HOSTS = MAIL_SERVER_DEFAULTS;

export function isImapSecure(port: number): boolean {
  return port !== MAIL_SERVER_DEFAULTS.imapPort;
}

export function isSmtpSecure(port: number): boolean {
  return port !== MAIL_SERVER_DEFAULTS.smtpPort;
}

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

export function withFixedMailHosts(
  username: string,
  password: string
): MailConfigInput {
  return {
    ...MAIL_SERVER_DEFAULTS,
    username,
    password,
  };
}

export function parseMailConfigInput(body: unknown): MailConfigInput | null {
  if (!isRecord(body)) {
    return null;
  }
  const username = readNonEmptyString(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (!username) {
    return null;
  }
  return withFixedMailHosts(username, password);
}

export function isMaskedOrEmptyPassword(password: string): boolean {
  return password.trim() === "" || password === PASSWORD_MASK;
}

export type MailPasswordUpdatePlan =
  | { kind: "replace"; plaintext: string }
  | { kind: "keep" }
  | { kind: "missing" };

export function planMailPasswordUpdate(
  incomingPassword: string | undefined,
  existingEncrypted: string | undefined
): MailPasswordUpdatePlan {
  const incoming = typeof incomingPassword === "string" ? incomingPassword : "";
  if (!isMaskedOrEmptyPassword(incoming)) {
    return { kind: "replace", plaintext: incoming.trim() };
  }
  if (typeof existingEncrypted === "string" && existingEncrypted.trim() !== "") {
    return { kind: "keep" };
  }
  return { kind: "missing" };
}

export function toPublicMailConfig(
  portalUserId: string,
  record: { username: string; passwordEncrypted: string; updatedAt: string } | null
): MailConfigPublic {
  if (!record) {
    return {
      portalUserId,
      ...MAIL_SERVER_DEFAULTS,
      username: "",
      passwordMasked: "",
      hasPassword: false,
      updatedAt: "",
    };
  }
  const hasPassword = record.passwordEncrypted.trim() !== "";
  return {
    portalUserId,
    ...MAIL_SERVER_DEFAULTS,
    username: record.username,
    passwordMasked: hasPassword ? PASSWORD_MASK : "",
    hasPassword,
    updatedAt: record.updatedAt,
  };
}

export function recordFromItem(item: Record<string, unknown> | null): {
  username: string;
  passwordEncrypted: string;
  updatedAt: string;
} | null {
  if (!item) {
    return null;
  }
  const username = readNonEmptyString(item.username) ?? "";
  const passwordEncrypted = typeof item.passwordEncrypted === "string" ? item.passwordEncrypted : "";
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : "";
  return { username, passwordEncrypted, updatedAt };
}
