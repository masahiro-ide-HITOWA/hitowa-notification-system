export type NotificationSystemName =
  | "カオナビ"
  | "TOKIUM"
  | "クラウドハウス労務"
  | "全社ポータル";

export interface NotificationItem {
  id: string;
  portalUserId: string;
  systemName: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  expiresAt?: number;
  sourceMessageId?: string;
  imapUid?: number;
}

export function parseNotificationsPortalUserId(
  headerUserId: string | null,
  queryUserId: string | null
): string | null {
  const header = headerUserId?.trim() ?? "";
  if (header !== "") {
    return header;
  }
  const query = queryUserId?.trim() ?? "";
  return query !== "" ? query : null;
}

export function countUnreadNotifications(items: NotificationItem[]): number {
  return items.filter((item) => !item.isRead).length;
}

export function formatUnreadBadge(count: number): string | null {
  if (!Number.isInteger(count) || count < 1) {
    return null;
  }
  return String(count);
}

function isNotificationSystemName(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalActionUrl(value: { actionUrl?: unknown; url?: unknown }): string | undefined {
  const raw = value.actionUrl ?? value.url;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

export function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) {
    return false;
  }
  const required =
    typeof value.id === "string" &&
    typeof value.portalUserId === "string" &&
    isNotificationSystemName(value.systemName) &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.isRead === "boolean" &&
    typeof value.createdAt === "string";
  if (!required) {
    return false;
  }
  if (value.actionUrl !== undefined && typeof value.actionUrl !== "string") {
    return false;
  }
  if (value.expiresAt !== undefined && typeof value.expiresAt !== "number") {
    return false;
  }
  if (value.sourceMessageId !== undefined && typeof value.sourceMessageId !== "string") {
    return false;
  }
  if (value.imapUid !== undefined && typeof value.imapUid !== "number") {
    return false;
  }
  return true;
}

export function parseNotificationList(value: unknown): NotificationItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items: NotificationItem[] = [];
  for (const entry of value) {
    if (!isNotificationItem(entry)) {
      return null;
    }
    const actionUrl = readOptionalActionUrl(entry);
    items.push(actionUrl ? { ...entry, actionUrl } : entry);
  }
  return items;
}

export function sortNotificationsByCreatedAtDesc(
  items: NotificationItem[]
): NotificationItem[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    }
    return bTime - aTime;
  });
}

export function notificationsFromDynamoItems(
  items: unknown[] | undefined
): NotificationItem[] {
  if (!items) {
    return [];
  }
  const parsed = parseNotificationList(items.filter(isNotificationItem));
  return parsed ? sortNotificationsByCreatedAtDesc(parsed) : [];
}
