const HITOWA_EMAIL_PATTERN = /[A-Z0-9._%+-]+@(?:gr\.)?hitowa\.com/gi;
const FORWARD_SUBJECT_PATTERN = /^(?:fwd:|fw:|転送[:：])\s*/i;
const REPLY_FORWARD_SUBJECT_PATTERN =
  /^(?:(?:re|fwd|fw|reply)\s*[:：]|転送\s*[:：]|返信\s*[:：])\s*/i;
export const DEFAULT_SHARED_NOTIFICATION_INBOX = "my-notification@hitowa.com";

export function sharedNotificationInbox(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.NOTIFICATION_SHARED_INBOX?.trim().toLowerCase() ?? "";
  return configured !== "" ? configured : DEFAULT_SHARED_NOTIFICATION_INBOX;
}

export function isSharedNotificationAddress(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const value = email?.trim().toLowerCase() ?? "";
  return value !== "" && value === sharedNotificationInbox(env);
}

export function fallbackPortalUserIds(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.NOTIFICATION_FALLBACK_PORTAL_USER_ID?.trim() ?? "";
  if (raw === "") {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id !== "" && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function selectIngestPortalUserIds(input: {
  recipientEmail: string;
  sourceRecipient?: string;
  mappedRecipientId: string | null;
  sharedInboxMappedId: string | null;
  envFallbackIds: string[];
  allMappedIds: string[];
}, env: NodeJS.ProcessEnv = process.env): string[] {
  if (input.mappedRecipientId) {
    return [input.mappedRecipientId];
  }
  const viaShared =
    isSharedNotificationAddress(input.recipientEmail, env) ||
    isSharedNotificationAddress(input.sourceRecipient, env);
  if (!viaShared) {
    return [];
  }
  if (input.envFallbackIds.length > 0) {
    return input.envFallbackIds;
  }
  if (input.sharedInboxMappedId) {
    return [input.sharedInboxMappedId];
  }
  return input.allMappedIds;
}

export function isForwardedSubject(subject: string): boolean {
  return FORWARD_SUBJECT_PATTERN.test(subject.trim());
}

export function stripForwardPrefixes(subject: string): string {
  let current = subject.trim();
  for (let i = 0; i < 6; i += 1) {
    const stripped = current.replace(REPLY_FORWARD_SUBJECT_PATTERN, "").trim();
    if (stripped === current) {
      break;
    }
    current = stripped;
  }
  return current;
}

function uniqueEmails(haystack: string): string[] {
  const pattern = new RegExp(HITOWA_EMAIL_PATTERN.source, "gi");
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const match of haystack.matchAll(pattern)) {
    const email = match[0].toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  return emails;
}

export function extractTargetRecipientEmail(
  subject: string,
  body: string,
  headerTo: string | null,
  headerCc: string | null = null,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const header = headerTo?.trim().toLowerCase() ?? "";
  const candidates = uniqueEmails(`${headerCc ?? ""}\n${subject}\n${body}`).filter(
    (email) => !isSharedNotificationAddress(email, env)
  );
  if (isSharedNotificationAddress(header, env)) {
    return candidates[0] ?? (header !== "" ? header : null);
  }
  if (header !== "" && /@(?:gr\.)?hitowa\.com$/i.test(header)) {
    return header;
  }
  if (isForwardedSubject(subject) && candidates[0]) {
    return candidates[0];
  }
  return header !== "" ? header : candidates[0] ?? null;
}
