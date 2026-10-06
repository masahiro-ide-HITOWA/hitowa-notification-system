import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { describeImapConnectionError, maskImapSecrets } from "@/lib/email-imap-error";
import { isImapSecure, isSmtpSecure, type MailConfigInput } from "@/lib/mail-config";

export class MailConfigVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigVerifyError";
  }
}

export interface MailConfigVerifyDeps {
  verifyImap: (config: MailConfigInput) => Promise<void>;
  verifySmtp: (config: MailConfigInput) => Promise<void>;
}

async function defaultVerifyImap(config: MailConfigInput): Promise<void> {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: isImapSecure(config.imapPort),
    connectionTimeout: 15000,
    auth: { user: config.username, pass: config.password },
    logger: false,
  });
  try {
    await client.connect();
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore logout failures after a successful or failed connect
    }
  }
}

async function defaultVerifySmtp(config: MailConfigInput): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: isSmtpSecure(config.smtpPort),
    auth: { user: config.username, pass: config.password },
  });
  await transporter.verify();
}

const defaultDeps: MailConfigVerifyDeps = {
  verifyImap: defaultVerifyImap,
  verifySmtp: defaultVerifySmtp,
};

function readStderr(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("stderr" in error)) {
    return null;
  }
  const stderr = error.stderr;
  if (typeof stderr === "string" && stderr.trim() !== "") {
    return stderr.trim();
  }
  if (stderr instanceof Uint8Array) {
    const text = Buffer.from(stderr).toString("utf8").trim();
    return text !== "" ? text : null;
  }
  return null;
}

export function describeMailVerifyFailure(
  error: unknown,
  endpoint: { channel: "IMAP" | "SMTP"; host: string; port: number; username: string; password: string }
): string {
  const detail = describeImapConnectionError(error, {
    host: endpoint.host,
    port: endpoint.port,
    user: endpoint.username,
    password: endpoint.password,
  });
  const stderr = readStderr(error);
  const stderrPart =
    stderr === null ? "" : `; stderr=${maskImapSecrets(stderr, endpoint.password)}`;
  return `${endpoint.channel} ${detail}${stderrPart}`;
}

function failVerify(channel: "IMAP" | "SMTP", error: unknown, config: MailConfigInput): never {
  const detail = describeMailVerifyFailure(error, {
    channel,
    host: channel === "IMAP" ? config.imapHost : config.smtpHost,
    port: channel === "IMAP" ? config.imapPort : config.smtpPort,
    username: config.username,
    password: config.password,
  });
  console.error("[mail-config] connection test failed", detail);
  throw new MailConfigVerifyError(`メール接続テストに失敗しました: ${detail}`);
}

export async function verifyMailConnection(
  config: MailConfigInput,
  deps: MailConfigVerifyDeps = defaultDeps
): Promise<void> {
  try {
    await deps.verifyImap(config);
  } catch (error) {
    failVerify("IMAP", error, config);
  }
  try {
    await deps.verifySmtp(config);
  } catch (error) {
    failVerify("SMTP", error, config);
  }
}
