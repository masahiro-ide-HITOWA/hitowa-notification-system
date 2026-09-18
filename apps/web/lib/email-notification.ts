import type { NotificationItem } from "@/lib/notifications";
import type { ParsedEmailNotification } from "@/lib/email-parser";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function mappingEmail(item: Record<string, unknown>): string | null {
  if (isRecord(item.attributes)) {
    const nested = readNonEmptyString(item.attributes.email);
    if (nested) {
      return nested.toLowerCase();
    }
  }
  const topLevel = readNonEmptyString(item.email);
  return topLevel ? topLevel.toLowerCase() : null;
}

function mappingPortalUserId(item: Record<string, unknown>): string | null {
  return (
    readNonEmptyString(item.portalUserId) ??
    readNonEmptyString(item.employeeId)
  );
}

export function resolvePortalUserIdFromMappings(
  items: unknown[] | undefined,
  recipientEmail: string
): string | null {
  if (!items || items.length === 0) {
    return null;
  }
  const target = recipientEmail.trim().toLowerCase();
  const completed = items.find((item) => {
    if (!isRecord(item)) {
      return false;
    }
    return mappingEmail(item) === target && item.status === "COMPLETED";
  });
  if (isRecord(completed)) {
    return mappingPortalUserId(completed);
  }

  const anyMatch = items.find((item) => {
    if (!isRecord(item)) {
      return false;
    }
    return mappingEmail(item) === target;
  });
  return isRecord(anyMatch) ? mappingPortalUserId(anyMatch) : null;
}

export function createNotificationFromEmail(
  parsed: ParsedEmailNotification,
  portalUserId: string,
  notificationId: string,
  createdAt: string
): NotificationItem {
  return {
    id: notificationId,
    portalUserId,
    systemName: parsed.systemName,
    title: parsed.title,
    body: parsed.body,
    isRead: false,
    createdAt,
  };
}

export function dynamoErrorName(error: unknown): string | null {
  if (!isRecord(error) || typeof error.name !== "string") {
    return null;
  }
  return error.name;
}

export function isDynamoTableMissing(error: unknown): boolean {
  const name = dynamoErrorName(error);
  if (name === "ResourceNotFoundException" || name === "ResourceNotFound") {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return /requested resource not found|cannot do operations on a non-existent table/i.test(
    error.message
  );
}

export function isDynamoValidationError(error: unknown): boolean {
  return dynamoErrorName(error) === "ValidationException";
}

export function logEmailWebhookError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(context, error.message);
    console.error(error.stack);
    return;
  }
  console.error(context, error);
}
