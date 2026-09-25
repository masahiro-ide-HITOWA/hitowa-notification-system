import {
  countUnreadNotifications,
  isNotificationItem,
  parseNotificationList,
  type NotificationItem,
} from "@/lib/notifications";

export type NotificationFilter = "all" | "unread" | "read";

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 10;

export interface NotificationFeed {
  success: true;
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  filter: NotificationFilter;
  unreadCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseNotificationFilter(value: string | null): NotificationFilter {
  if (value === "unread" || value === "read" || value === "all") {
    return value;
  }
  return "all";
}

export function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function filterNotifications(
  items: NotificationItem[],
  filter: NotificationFilter
): NotificationItem[] {
  if (filter === "unread") {
    return items.filter((item) => !item.isRead);
  }
  if (filter === "read") {
    return items.filter((item) => item.isRead);
  }
  return items;
}

export function paginateNotifications(
  items: NotificationItem[],
  page: number,
  limit: number
): { items: NotificationItem[]; page: number; total: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page: safePage,
    total,
    totalPages: total === 0 ? 1 : totalPages,
  };
}

export function buildNotificationFeed(
  allItems: NotificationItem[],
  filter: NotificationFilter,
  page: number,
  limit: number
): NotificationFeed {
  const filtered = filterNotifications(allItems, filter);
  const paged = paginateNotifications(filtered, page, limit);
  return {
    success: true,
    items: paged.items,
    page: paged.page,
    limit,
    total: paged.total,
    totalPages: paged.totalPages,
    filter,
    unreadCount: countUnreadNotifications(allItems),
  };
}

export function parseNotificationFeed(value: unknown): NotificationFeed | null {
  if (Array.isArray(value)) {
    const items = parseNotificationList(value);
    return items ? buildNotificationFeed(items, "all", 1, items.length || DEFAULT_NOTIFICATION_PAGE_SIZE) : null;
  }
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }
  const items: NotificationItem[] = [];
  for (const entry of value.items) {
    if (!isNotificationItem(entry)) {
      return null;
    }
    items.push(entry);
  }
  const filter = parseNotificationFilter(typeof value.filter === "string" ? value.filter : "all");
  const page = typeof value.page === "number" && value.page >= 1 ? value.page : 1;
  const limit =
    typeof value.limit === "number" && value.limit >= 1 ? value.limit : DEFAULT_NOTIFICATION_PAGE_SIZE;
  const total = typeof value.total === "number" ? value.total : items.length;
  const totalPages = typeof value.totalPages === "number" ? value.totalPages : 1;
  const unreadCount = typeof value.unreadCount === "number" ? value.unreadCount : countUnreadNotifications(items);
  return {
    success: true,
    items,
    page,
    limit,
    total,
    totalPages,
    filter,
    unreadCount,
  };
}
