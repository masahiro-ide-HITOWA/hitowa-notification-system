import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { MailConfigInput } from "@/lib/mail-config";
import { getMailConfigForConnection } from "@/lib/mail-config-store";
import {
  CONFIG_MISSING_MESSAGE,
} from "@/lib/mail-imap-model";
import {
  MailSmtpError,
  classifySmtpFailure,
  type SendMailPayload,
  type SendMailResult,
} from "@/lib/mail-smtp-model";

export interface SmtpTransportLike {
  sendMail(options: {
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
  }): Promise<{ messageId?: string }>;
}

export interface MailSmtpDeps {
  loadConfig: (portalUserId: string) => Promise<(MailConfigInput & { portalUserId: string }) | null>;
  createTransport: (config: MailConfigInput) => SmtpTransportLike;
}

function defaultCreateTransport(config: MailConfigInput): SmtpTransportLike {
  const transporter: Transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });
  return transporter as unknown as SmtpTransportLike;
}

const defaultDeps: MailSmtpDeps = {
  loadConfig: getMailConfigForConnection,
  createTransport: defaultCreateTransport,
};

export async function sendMail(
  portalUserId: string,
  payload: SendMailPayload,
  deps: MailSmtpDeps = defaultDeps
): Promise<SendMailResult> {
  if (!payload.to.trim() || !payload.subject.trim() || !payload.body.trim()) {
    throw new MailSmtpError("VALIDATION_FAILED", "宛先・件名・本文は必須です");
  }

  const config = await deps.loadConfig(portalUserId);
  if (!config) {
    throw new MailSmtpError("CONFIG_MISSING", CONFIG_MISSING_MESSAGE);
  }

  const transport = deps.createTransport(config);
  try {
    const info = await transport.sendMail({
      from: config.username,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.body,
    });
    return {
      success: true,
      message: "メールを送信しました",
      messageId: info.messageId ?? "",
    };
  } catch (error) {
    throw classifySmtpFailure(error);
  }
}
