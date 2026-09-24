function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed !== "" ? trimmed : null;
}

export function parseUnlinkPortalUserId(
  body: unknown,
  headerUserId: string | null
): string | null {
  const fromHeader = nonEmptyString(headerUserId);
  if (fromHeader) {
    return fromHeader;
  }
  if (!isRecord(body)) {
    return null;
  }
  return nonEmptyString(body.portalUserId);
}

export function parseUnlinkEmail(body: unknown, headerEmail: string | null): string | null {
  const fromHeader = nonEmptyString(headerEmail);
  if (fromHeader) {
    return fromHeader;
  }
  if (!isRecord(body)) {
    return null;
  }
  return nonEmptyString(body.email);
}

export function parseUnlinkCode(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  return nonEmptyString(body.oneTimeCode) ?? nonEmptyString(body.code);
}
