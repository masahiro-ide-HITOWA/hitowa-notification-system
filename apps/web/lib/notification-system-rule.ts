export interface NotificationSystemRule {
  systemName: string;
  fromDomains: string[];
  subjectKeywords: string[];
  bodyKeywords: string[];
  enabled: boolean;
}

export interface NotificationMailMatchInput {
  from?: string;
  subject?: string;
  title?: string;
  body?: string;
}

export const BUILTIN_NOTIFICATION_SYSTEM_RULES: NotificationSystemRule[] = [
  {
    systemName: "カオナビ",
    fromDomains: ["kaonavi.jp"],
    subjectKeywords: ["カオナビ", "kaonavi"],
    bodyKeywords: ["カオナビ", "kaonavi"],
    enabled: true,
  },
  {
    systemName: "TOKIUM",
    fromDomains: ["tokium.jp", "keihi.com"],
    subjectKeywords: ["TOKIUM", "【TOKIUM】"],
    bodyKeywords: ["tokium", "keihi.com"],
    enabled: true,
  },
  {
    systemName: "クラウドハウス労務",
    fromDomains: [],
    subjectKeywords: ["クラウドハウス"],
    bodyKeywords: ["クラウドハウス", "cloudhouse"],
    enabled: true,
  },
];

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

export function parseNotificationSystemRule(item: unknown): NotificationSystemRule | null {
  if (!isRecord(item) || typeof item.systemName !== "string" || item.systemName.trim() === "") {
    return null;
  }
  return {
    systemName: item.systemName.trim(),
    fromDomains: readStringList(item.fromDomains),
    subjectKeywords: readStringList(item.subjectKeywords),
    bodyKeywords: readStringList(item.bodyKeywords),
    enabled: item.enabled !== false && item.enabled !== "false",
  };
}

export function parseNotificationSystemRules(items: unknown[]): NotificationSystemRule[] {
  return items.flatMap((item) => {
    const rule = parseNotificationSystemRule(item);
    return rule ? [rule] : [];
  });
}

function includesKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => keyword !== "" && haystack.includes(keyword.toLowerCase()));
}

export function matchNotificationSystem(
  rules: NotificationSystemRule[],
  mail: NotificationMailMatchInput
): NotificationSystemRule | null {
  const from = (mail.from ?? "").toLowerCase();
  const subject = (mail.subject ?? mail.title ?? "").toLowerCase();
  const body = (mail.body ?? "").toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }
    const domainHit = rule.fromDomains.some((domain) => domain !== "" && from.includes(domain.toLowerCase()));
    if (domainHit || includesKeyword(subject, rule.subjectKeywords) || includesKeyword(body, rule.bodyKeywords)) {
      return rule;
    }
  }
  return null;
}
