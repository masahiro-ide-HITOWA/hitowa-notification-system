import type { MailConfigPublic } from "@/lib/mail-config";

export const MAIL_CONFIG_SAVED_MESSAGE = "メール接続設定を保存しました";
export const MAIL_CONNECTION_TIMEOUT_MESSAGE = "接続タイムアウトが発生しました";

export interface MailConfigApiBody {
  success?: boolean;
  message?: string;
  config?: MailConfigPublic;
}

export interface MailConfigFormValues {
  portalUserId: string;
  email: string;
  imapHost: string;
  imapPort: string;
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
}

export function mailConfigRequestHeaders(portalUserId: string, email: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-user-id": portalUserId,
    "x-user-email": email,
  };
}

export function mailConfigRequestBody(values: MailConfigFormValues): string {
  return JSON.stringify({
    portalUserId: values.portalUserId,
    email: values.email,
    imapHost: values.imapHost.trim(),
    imapPort: Number(values.imapPort),
    smtpHost: values.smtpHost.trim(),
    smtpPort: Number(values.smtpPort),
    username: values.username.trim(),
    password: values.password,
  });
}

export async function readApiJson<T>(response: Response): Promise<T> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    throw new Error(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  }
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  }
  const gatewayTimeout = response.status === 504 || response.status === 408;
  if (gatewayTimeout && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(MAIL_CONNECTION_TIMEOUT_MESSAGE);
    }
    throw error;
  }
}

export function mailApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  if (error.message === MAIL_CONNECTION_TIMEOUT_MESSAGE) {
    return error.message;
  }
  if (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    error instanceof SyntaxError ||
    /Unexpected end of JSON input|ETIMEDOUT|timeout|Failed to fetch|NetworkError/i.test(error.message)
  ) {
    return MAIL_CONNECTION_TIMEOUT_MESSAGE;
  }
  return error.message;
}
