const HITOWA_EMAIL_PATTERN = /[A-Z0-9._%+-]+@(?:gr\.)?hitowa\.com/gi;
const FORWARD_SUBJECT_PATTERN = /^(?:fwd:|fw:|転送[:：])\s*/i;

export function isForwardedSubject(subject: string): boolean {
  return FORWARD_SUBJECT_PATTERN.test(subject.trim());
}

export function stripForwardPrefixes(subject: string): string {
  let current = subject.trim();
  for (let i = 0; i < 3; i += 1) {
    const stripped = current.replace(FORWARD_SUBJECT_PATTERN, "").trim();
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
  headerTo: string | null
): string | null {
  const haystack = `${subject}\n${body}`;
  const emails = uniqueEmails(haystack);
  const header = headerTo?.trim().toLowerCase() ?? "";
  if (header !== "" && /@(?:gr\.)?hitowa\.com$/i.test(header)) {
    return header;
  }
  if (isForwardedSubject(subject) && emails[0]) {
    return emails[0];
  }
  return header !== "" ? header : null;
}
