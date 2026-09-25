import { extractActionUrl } from "@/lib/email-action-url";
import type { NotificationSystemName } from "@/lib/notifications";

export interface ParsedEmailNotification {
  systemName: NotificationSystemName;
  recipientEmail: string;
  title: string;
  body: string;
  actionUrl?: string;
}

export type ParseEmailResult =
  | { ok: true; notification: ParsedEmailNotification }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function firstAddress(value: unknown): string | null {
  const direct = readNonEmptyString(value);
  if (direct) {
    const match = direct.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].toLowerCase() : direct.toLowerCase();
  }
  if (Array.isArray(value) && value.length > 0) {
    return firstAddress(value[0]);
  }
  if (isRecord(value)) {
    return firstAddress(value.address ?? value.email ?? value.raw);
  }
  return null;
}

export function detectNotificationSystemName(
  from: string,
  subject: string,
  body: string
): NotificationSystemName {
  const haystack = `${from} ${subject} ${body}`.toLowerCase();

  if (
    haystack.includes("kaonavi") ||
    haystack.includes("カオナビ") ||
    from.includes("kaonavi.jp")
  ) {
    return "カオナビ";
  }
  if (
    haystack.includes("tokium") ||
    haystack.includes("keihi.com") ||
    subject.includes("【TOKIUM】")
  ) {
    return "TOKIUM";
  }
  if (
    haystack.includes("cloudhouse") ||
    haystack.includes("クラウドハウス")
  ) {
    return "クラウドハウス労務";
  }
  return "全社ポータル";
}

function summarizeBody(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 180) {
    return collapsed;
  }
  return collapsed.slice(0, 180) + "...";
}

function cleanTitle(subject: string, systemName: NotificationSystemName): string {
  const stripped = subject
    .replace(/【カオナビ】/g, "")
    .replace(/【TOKIUM】/g, "")
    .replace(/【クラウドハウス労務】/g, "")
    .replace(/【クラウドハウス】/g, "")
    .trim();
  if (stripped !== "") {
    return stripped;
  }
  if (systemName === "カオナビ") return "評価・ワークフロー手続きの案内";
  if (systemName === "TOKIUM") return "経費精算・申請の承認依頼";
  if (systemName === "クラウドハウス労務") return "労務手続き・書類回答のお願い";
  return "ポータルからのお知らせ";
}

export function parseEmailNotification(payload: unknown): ParseEmailResult {
  if (!isRecord(payload)) {
    return { ok: false, message: "メールペイロードが不正です" };
  }

  const from =
    firstAddress(payload.from) ?? firstAddress(payload.sender) ?? "";
  const recipientEmail =
    firstAddress(payload.recipientEmail) ??
    firstAddress(payload.to) ??
    firstAddress(payload.recipient);
  const subject = readNonEmptyString(payload.subject) ?? "";
  const rawBody =
    readNonEmptyString(payload.body) ??
    readNonEmptyString(payload.text) ??
    readNonEmptyString(payload.html) ??
    "";

  if (!recipientEmail) {
    return { ok: false, message: "宛先メールアドレスを特定できません" };
  }
  if (subject === "" && rawBody === "") {
    return { ok: false, message: "件名または本文が必要です" };
  }

  const systemName = detectNotificationSystemName(from, subject, rawBody);
  const actionUrl = extractActionUrl(`${subject}\n${rawBody}`, systemName);
  return {
    ok: true,
    notification: {
      systemName,
      recipientEmail,
      title: cleanTitle(subject, systemName),
      body: summarizeBody(rawBody || subject),
      ...(actionUrl ? { actionUrl } : {}),
    },
  };
}
