import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
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

export async function verifyMailConnection(
  config: MailConfigInput,
  deps: MailConfigVerifyDeps = defaultDeps
): Promise<void> {
  try {
    await deps.verifyImap(config);
    await deps.verifySmtp(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new MailConfigVerifyError(`メール接続テストに失敗しました: ${message}`);
  }
}
