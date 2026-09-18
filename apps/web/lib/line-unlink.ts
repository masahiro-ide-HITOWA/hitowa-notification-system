function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUnlinkPortalUserId(
  body: unknown,
  headerUserId: string | null
): string | null {
  const fromHeader = headerUserId?.trim() ?? "";
  if (fromHeader !== "") {
    return fromHeader;
  }

  if (!isRecord(body)) {
    return null;
  }

  const fromBody = body.portalUserId;
  if (typeof fromBody === "string" && fromBody.trim() !== "") {
    return fromBody.trim();
  }

  return null;
}

export function mappingOneTimeCodes(items: unknown[] | undefined): string[] {
  if (!items) {
    return [];
  }

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    return typeof item.oneTimeCode === "string" && item.oneTimeCode !== ""
      ? [item.oneTimeCode]
      : [];
  });
}
