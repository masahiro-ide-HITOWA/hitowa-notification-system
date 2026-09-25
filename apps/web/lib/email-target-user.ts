import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

const HITOWA_EMAIL_PATTERN = /[A-Z0-9._%+-]+@(?:gr\.)?hitowa\.com/gi;
const EMPLOYEE_ID_PATTERN = /(?:社員番号|社員コード|社員ID)[:：\s]*([0-9]{5,8})/gi;
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

function employeeIdsInText(haystack: string): string[] {
  const ids: string[] = [];
  const pattern = new RegExp(EMPLOYEE_ID_PATTERN.source, "gi");
  let match = pattern.exec(haystack);
  while (match) {
    ids.push(match[1]);
    match = pattern.exec(haystack);
  }
  return ids;
}

export function extractTargetRecipientEmail(
  subject: string,
  body: string,
  headerTo: string | null
): string | null {
  const haystack = `${subject}\n${body}`;
  const demoEmail = DEMO_USER_PROFILE.email.toLowerCase();
  const demoEmployeeId = DEMO_USER_PROFILE.portalUserId;
  const emails = uniqueEmails(haystack);

  if (emails.includes(demoEmail)) {
    return demoEmail;
  }
  if (employeeIdsInText(haystack).includes(demoEmployeeId)) {
    return demoEmail;
  }
  if (
    new RegExp(`\\b${demoEmployeeId}\\b`).test(haystack) &&
    (isForwardedSubject(subject) || /tokium|keihi\.com|【tokium】/i.test(haystack))
  ) {
    return demoEmail;
  }

  const header = headerTo?.trim().toLowerCase() ?? "";
  if (header !== "" && /@(?:gr\.)?hitowa\.com$/i.test(header)) {
    return header;
  }
  if (isForwardedSubject(subject) && emails[0]) {
    return emails[0];
  }
  return header !== "" ? header : null;
}
