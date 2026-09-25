export type MailImapErrorCode = "CONFIG_MISSING" | "CONNECTION_FAILED" | "NOT_FOUND";

export class MailImapError extends Error {
  readonly code: MailImapErrorCode;
  readonly detail?: string;

  constructor(code: MailImapErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "MailImapError";
    this.code = code;
    this.detail = detail;
  }
}

export function isMailImapError(error: unknown): error is MailImapError {
  return error instanceof MailImapError;
}

export interface MailAddressLike {
  name?: string;
  address?: string;
}

export interface MailEnvelopeLike {
  date?: Date | string;
  subject?: string;
  from?: MailAddressLike[];
  to?: MailAddressLike[];
}

export interface MailFetchedLike {
  uid: number;
  flags?: Set<string> | string[];
  envelope?: MailEnvelopeLike;
  source?: Buffer;
}

export interface ParsedMailLike {
  subject?: string;
  date?: Date;
  html?: string | false;
  text?: string | false;
  from?: { text?: string; value?: MailAddressLike[] };
  to?: { text?: string; value?: MailAddressLike[] };
}

export interface MailListItem {
  uid: number;
  subject: string;
  from: string;
  date: string;
  isRead: boolean;
  flags: string[];
}

export interface MailDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  html: string;
  text: string;
}

export const MAIL_FOLDERS = [
  { id: "INBOX", label: "受信トレイ" },
  { id: "Sent", label: "送信済み" },
  { id: "Drafts", label: "下書き" },
  { id: "Trash", label: "ゴミ箱" },
] as const;

export const CONFIG_MISSING_MESSAGE =
  "設定画面（/settings/mail）でIMAP接続情報を設定してください";

export function normalizeMailFolder(value: string | null | undefined): string {
  const folder = (value ?? "INBOX").trim() || "INBOX";
  return /^[A-Za-z0-9._-]+$/.test(folder) ? folder : "INBOX";
}

export function parseMailLimit(value: string | null | undefined, fallback = 20): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 50);
}

export function latestSequenceRange(exists: number, limit: number): string | null {
  if (!Number.isInteger(exists) || exists <= 0) {
    return null;
  }
  const start = Math.max(1, exists - limit + 1);
  return `${start}:${exists}`;
}

export function formatMailAddresses(addresses?: MailAddressLike[]): string {
  if (!addresses || addresses.length === 0) {
    return "";
  }
  return addresses
    .map((item) => {
      if (item.name && item.address) {
        return `${item.name} <${item.address}>`;
      }
      return item.address || item.name || "";
    })
    .filter((part) => part !== "")
    .join(", ");
}

function flagList(flags?: Set<string> | string[]): string[] {
  if (!flags) {
    return [];
  }
  return flags instanceof Set ? [...flags] : [...flags];
}

export function isMailRead(flags?: Set<string> | string[]): boolean {
  return flagList(flags).some((flag) => flag.toLowerCase() === "\\seen");
}

export function toMailListItem(message: MailFetchedLike): MailListItem {
  const envelope = message.envelope;
  const dateValue = envelope?.date;
  return {
    uid: message.uid,
    subject: envelope?.subject?.trim() || "(件名なし)",
    from: formatMailAddresses(envelope?.from) || "(差出人不明)",
    date: dateValue ? new Date(dateValue).toISOString() : "",
    isRead: isMailRead(message.flags),
    flags: flagList(message.flags),
  };
}

export function toMailDetail(uid: number, parsed: ParsedMailLike): MailDetail {
  const html = typeof parsed.html === "string" ? parsed.html : "";
  const text = typeof parsed.text === "string" ? parsed.text : "";
  return {
    uid,
    subject: parsed.subject?.trim() || "(件名なし)",
    from: parsed.from?.text || formatMailAddresses(parsed.from?.value) || "(差出人不明)",
    to: parsed.to?.text || formatMailAddresses(parsed.to?.value) || "",
    date: parsed.date ? parsed.date.toISOString() : "",
    html,
    text,
  };
}
