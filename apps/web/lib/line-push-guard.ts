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
  if (status !== 400 && status !== 403) {
    return false;
  }
  const haystack = collectLineErrorText(body).toLowerCase();
  if (haystack === "") {
    return false;
  }
  return LINE_BLOCK_ERROR_PATTERNS.some((pattern) => pattern.test(haystack));
}

const LINE_BLOCK_ERROR_PATTERNS: RegExp[] = [
  /not a friend/,
  /user is blocked/,
  /have blocked you/,
  /has blocked you/,
  /has blocked the (official )?account/,
  /not added you as a friend/,
];

function collectLineErrorText(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") {
    return "";
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return trimmed;
    }
    const message = readNonEmptyString(parsed.message) ?? "";
    const details = Array.isArray(parsed.details)
      ? parsed.details
          .map((detail) => {
            if (!isRecord(detail)) {
              return "";
            }
            return `${readNonEmptyString(detail.message) ?? ""} ${readNonEmptyString(detail.code) ?? ""}`;
          })
          .join(" ")
      : "";
    return `${message} ${details}`.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

const TEST_EMAIL_SUFFIXES = ["@example.com", "@example.org"];
const TEST_EMAIL_EXACT = new Set(["masahiro-ide@hitowa.com", "masahiro-ide@gr.hitowa.com"]);

export function shouldPersistLineBlockDisable(
  email: string | null,
  options?: { nodeEnv?: string; autoDisable?: string }
): boolean {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? "";
  const autoDisable = options?.autoDisable ?? process.env.LINE_AUTO_DISABLE_ON_BLOCK;
  if (autoDisable === "false") {
    return false;
  }
  if ((nodeEnv === "development" || nodeEnv === "test") && autoDisable !== "true") {
    return false;
  }
  const normalized = email?.trim().toLowerCase() ?? "";
  if (
    normalized === "" ||
    TEST_EMAIL_EXACT.has(normalized) ||
    TEST_EMAIL_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  ) {
    return false;
  }
  return true;
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
    const status = item.status;
    return (
      lineUserId !== null &&
      (status === "COMPLETED" || status === "ACTIVE") &&
      !isInactiveLineRecipient(item)
    );
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
