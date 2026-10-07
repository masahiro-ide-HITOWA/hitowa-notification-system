import { stripForwardPrefixes } from "@/lib/email-target-user";

export interface NotificationSystemRule {
  systemName: string;
  fromAddresses: string[];
  subjectPrefixes?: string[];
  enabled: boolean;
}

export interface NotificationMailMatchInput {
  from?: string;
  originalFrom?: string;
  subject?: string;
  title?: string;
  body?: string;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const FROM_LINE = /^(?:from|差出人)\s*[:：]\s*(.+)$/i;
const FORWARD_MARKER =
  /-{3,}\s*(?:forwarded message|original message|転送されたメッセージ|元のメッセージ)\s*-{3,}/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim());
}

function emailAddress(value: string): string {
  const match = value.match(EMAIL_PATTERN);
  return (match ? match[0] : value).trim().toLowerCase();
}

function headerBlock(body: string): string {
  const lines = body.split(/\r?\n/).slice(0, 20);
  const block: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (block.length > 0) {
        break;
      }
      continue;
    }
    block.push(line);
  }
  return block.join("\n");
}

export function extractOriginalSender(body: string): string | null {
  const markerIndex = body.search(FORWARD_MARKER);
  const region = markerIndex >= 0 ? body.slice(markerIndex, markerIndex + 600) : headerBlock(body);
  for (const line of region.split(/\r?\n/).slice(0, 15)) {
    const matched = line.trim().match(FROM_LINE);
    const email = matched?.[1]?.match(EMAIL_PATTERN);
    if (email) {
      return email[0].toLowerCase();
    }
  }
  return null;
}

export function parseNotificationSystemRule(item: unknown): NotificationSystemRule | null {
  if (!isRecord(item) || typeof item.systemName !== "string" || item.systemName.trim() === "") {
    return null;
  }
  return {
    systemName: item.systemName.trim(),
    fromAddresses: readStringList(item.fromAddresses ?? item.fromAddress),
    subjectPrefixes: readStringList(item.subjectPrefixes ?? item.subjectPrefix),
    enabled: item.enabled !== false && item.enabled !== "false",
  };
}

export function parseNotificationSystemRules(items: unknown[]): NotificationSystemRule[] {
  return items.flatMap((item) => {
    const rule = parseNotificationSystemRule(item);
    return rule ? [rule] : [];
  });
}

function senderCandidates(mail: NotificationMailMatchInput): string[] {
  const found = [mail.from, mail.originalFrom, extractOriginalSender(mail.body ?? "")];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const value of found) {
    if (!value) {
      continue;
    }
    const email = emailAddress(value);
    if (!email.includes("@") || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function matchNotificationSystem(
  rules: NotificationSystemRule[],
  mail: NotificationMailMatchInput
): NotificationSystemRule | null {
  const senders = senderCandidates(mail);
  const subject = stripForwardPrefixes(mail.subject ?? mail.title ?? "").toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled || rule.fromAddresses.length === 0) {
      continue;
    }
    const addressHit = rule.fromAddresses.some((address) => senders.includes(emailAddress(address)));
    if (!addressHit) {
      continue;
    }
    const prefixes = (rule.subjectPrefixes ?? [])
      .map((prefix) => prefix.trim())
      .filter((prefix) => prefix !== "");
    if (prefixes.length === 0 || prefixes.some((prefix) => subject.startsWith(prefix.toLowerCase()))) {
      return rule;
    }
  }
  return null;
}
