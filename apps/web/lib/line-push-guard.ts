export type LinePushTarget =
  | { outcome: "inactive" }
  | { outcome: "not-linked" }
  | { outcome: "linked"; lineUserId: string; email: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function mappingEmailFromItem(item: Record<string, unknown>): string | null {
  if (isRecord(item.attributes)) {
    const nested = readNonEmptyString(item.attributes.email);
    if (nested) {
      return nested.toLowerCase();
    }
  }
  const email = readNonEmptyString(item.email);
  return email ? email.toLowerCase() : null;
}

export function isInactiveLineRecipient(item: Record<string, unknown>): boolean {
  if (item.isActive === false) {
    return true;
  }
  if (item.status === "DISABLED") {
    return true;
  }
  if (isRecord(item.attributes) && item.attributes.isActive === false) {
    return true;
  }
  if (isRecord(item.attributes) && item.attributes.status === "DISABLED") {
    return true;
  }
  return false;
}

export function isLineBlockOrUnfriendError(status: number, body: string): boolean {
  if (status < 400 || status >= 500) {
    return false;
  }
  const haystack = body.toLowerCase();
  return (
    haystack.includes("not a friend") ||
    haystack.includes("blocked") ||
    haystack.includes("has blocked") ||
    haystack.includes("not added you as a friend")
  );
}

export function evaluateLinePushTarget(
  items: unknown[] | undefined,
  portalUserId: string
): LinePushTarget {
  if (!items) {
    return { outcome: "not-linked" };
  }
  const matches = items.filter((item): item is Record<string, unknown> => {
    if (!isRecord(item)) {
      return false;
    }
    const mappedId =
      readNonEmptyString(item.portalUserId) ?? readNonEmptyString(item.employeeId);
    return mappedId === portalUserId;
  });
  if (matches.some((item) => isInactiveLineRecipient(item))) {
    return { outcome: "inactive" };
  }
  const linked = matches.find((item) => {
    const lineUserId = readNonEmptyString(item.lineUserId);
    return item.status === "COMPLETED" && lineUserId !== null;
  });
  if (!linked) {
    return { outcome: "not-linked" };
  }
  return {
    outcome: "linked",
    lineUserId: readNonEmptyString(linked.lineUserId) ?? "",
    email: mappingEmailFromItem(linked),
  };
}
