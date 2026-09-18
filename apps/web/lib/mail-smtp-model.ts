export type MailSmtpErrorCode =
  | "CONFIG_MISSING"
  | "CONNECTION_FAILED"
  | "AUTH_FAILED"
  | "VALIDATION_FAILED";

export class MailSmtpError extends Error {
  readonly code: MailSmtpErrorCode;

  constructor(code: MailSmtpErrorCode, message: string) {
    super(message);
    this.name = "MailSmtpError";
    this.code = code;
  }
}

export function isMailSmtpError(error: unknown): error is MailSmtpError {
  return error instanceof MailSmtpError;
}

export type SendMailMode = "new" | "reply" | "forward";

export interface SendMailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  replyToUid?: number;
  mode?: SendMailMode;
  fromName?: string;
  fromEmail?: string;
}

export interface MailFromHeader {
  name: string;
  address: string;
}

export function resolveDisplayName(displayName: string | undefined, userEmail: string): string {
  const trimmed = displayName?.trim();
  if (trimmed) {
    return trimmed;
  }
  const at = userEmail.indexOf("@");
  return at > 0 ? userEmail.slice(0, at) : userEmail;
}

export function resolveSenderFrom(
  displayName: string | undefined,
  userEmail: string
): MailFromHeader {
  return {
    name: resolveDisplayName(displayName, userEmail),
    address: userEmail,
  };
}

export const MISSING_TO_MESSAGE = "宛先(to)が入力されていません";

export function parseRecipientList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseRecipientList(item));
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return [];
  }
  const text = String(value).trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function readTrimmedTo(body: unknown): string {
  if (!isRecord(body)) {
    return "";
  }
  return String(body.to ?? "").trim();
}

export interface SendMailResult {
  success: true;
  message: string;
  messageId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function parseSendMailPayload(body: unknown): SendMailPayload | null {
  if (!isRecord(body)) {
    return null;
  }
  const toList = parseRecipientList(body.to);
  const to = toList.join(", ");
  const subject = readOptionalString(body.subject);
  const text = readOptionalString(body.body);
  if (!to || !subject || !text) {
    return null;
  }
  const mode = body.mode;
  const parsedMode: SendMailMode | undefined =
    mode === "new" || mode === "reply" || mode === "forward" ? mode : undefined;
  const replyToUid =
    typeof body.replyToUid === "number" && Number.isInteger(body.replyToUid) && body.replyToUid > 0
      ? body.replyToUid
      : undefined;
  return {
    to,
    cc: readOptionalString(body.cc),
    bcc: readOptionalString(body.bcc),
    subject,
    body: text,
    replyToUid,
    mode: parsedMode ?? "new",
    fromName: readOptionalString(body.fromName),
    fromEmail: readOptionalString(body.fromEmail) ?? readOptionalString(body.email),
  };
}

export function extractEmailAddress(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  if (angled?.[1]) {
    return angled[1].trim();
  }
  return from.replace(/\(差出人不明\)/g, "").trim();
}

export function withSubjectPrefix(subject: string, prefix: "Re:" | "Fwd:"): string {
  const trimmed = subject.replace(/^\(件名なし\)$/, "").trim();
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
    return trimmed || prefix;
  }
  return `${prefix} ${trimmed}`.trim();
}

export function quotedForwardBody(detail: {
  from: string;
  to: string;
  date: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const original = detail.text.trim() || detail.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [
    "",
    "----- 転送されたメッセージ -----",
    `差出人: ${detail.from}`,
    `宛先: ${detail.to}`,
    `送信日時: ${detail.date}`,
    `件名: ${detail.subject}`,
    "",
    original,
  ].join("\n");
}

export function classifySmtpFailure(error: unknown): MailSmtpError {
  const message = error instanceof Error ? error.message : "SMTP送信に失敗しました";
  const code =
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code.toUpperCase()
      : "";
  const responseCode =
    error instanceof Error && "responseCode" in error && typeof error.responseCode === "number"
      ? error.responseCode
      : 0;
  if (
    code === "EAUTH" ||
    responseCode === 535 ||
    /auth|authentication|invalid login/i.test(message)
  ) {
    return new MailSmtpError("AUTH_FAILED", `SMTP認証に失敗しました: ${message}`);
  }
  return new MailSmtpError("CONNECTION_FAILED", `SMTP接続に失敗しました: ${message}`);
}
