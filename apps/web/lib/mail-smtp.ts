import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isSmtpSecure, type MailConfigInput } from "@/lib/mail-config";
import { getMailConfigForConnection } from "@/lib/mail-config-store";
import {
  CONFIG_MISSING_MESSAGE,
} from "@/lib/mail-imap-model";
import {
  MISSING_TO_MESSAGE,
  MailSmtpError,
  classifySmtpFailure,
  parseRecipientList,
  resolveSenderFrom,
  type SendMailPayload,
  type SendMailResult,
} from "@/lib/mail-smtp-model";

export interface SmtpTransportLike {
  sendMail(options: {
    from: { name: string; address: string };
    envelope?: { from: string; to: string[] };
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
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
    secure: isSmtpSecure(config.smtpPort),
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
  const toList = parseRecipientList(payload.to);
  if (toList.length === 0) {
    throw new MailSmtpError("VALIDATION_FAILED", MISSING_TO_MESSAGE);
  }
  if (!payload.subject.trim() || !payload.body.trim()) {
    throw new MailSmtpError("VALIDATION_FAILED", "宛先・件名・本文は必須です");
  }

  const config = await deps.loadConfig(portalUserId);
  if (!config) {
    throw new MailSmtpError("CONFIG_MISSING", CONFIG_MISSING_MESSAGE);
  }

  const transport = deps.createTransport(config);
  const userEmail =
    payload.fromEmail && payload.fromEmail.includes("@")
      ? payload.fromEmail
      : config.username;
  const from = resolveSenderFrom(payload.fromName, userEmail);
  const ccList = parseRecipientList(payload.cc);
  const bccList = parseRecipientList(payload.bcc);

  try {
    const info = await transport.sendMail({
      from,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      envelope: {
        from: from.address,
        to: [...toList, ...ccList, ...bccList],
      },
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
