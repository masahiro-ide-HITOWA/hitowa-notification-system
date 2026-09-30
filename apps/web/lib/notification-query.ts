import {
  countUnreadNotifications,
  isNotificationItem,
  parseNotificationList,
  type NotificationItem,
} from "@/lib/notifications";

export type NotificationFilter = "all" | "unread" | "read";
export type NotificationSaasFilter = "all" | "カオナビ" | "TOKIUM" | "クラウドハウス";

export const NOTIFICATION_READ_FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "すべて" },
  { id: "unread", label: "未読" },
  { id: "read", label: "既読" },
];

export const NOTIFICATION_SAAS_FILTERS: Array<{ id: NotificationSaasFilter; label: string }> = [
  { id: "all", label: "すべて" },
  { id: "カオナビ", label: "カオナビ" },
  { id: "TOKIUM", label: "TOKIUM" },
  { id: "クラウドハウス", label: "クラウドハウス" },
];

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 10;

export interface NotificationFeed {
  success: true;
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  filter: NotificationFilter;
  saasFilter: NotificationSaasFilter;
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

export function parseNotificationSaasFilter(value: string | null): NotificationSaasFilter {
  if (value === "カオナビ" || value === "TOKIUM" || value === "クラウドハウス") {
    return value;
  }
  return "all";
}

export function matchesSaasFilter(
  item: NotificationItem,
  saasFilter: NotificationSaasFilter
): boolean {
  if (saasFilter === "all") {
    return true;
  }
  return item.systemName.includes(saasFilter);
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
  filter: NotificationFilter,
  saasFilter: NotificationSaasFilter = "all"
): NotificationItem[] {
  return items.filter((item) => {
    const matchesRead =
      filter === "all" || (filter === "unread" ? !item.isRead : item.isRead);
    return matchesRead && matchesSaasFilter(item, saasFilter);
  });
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
  limit: number,
  saasFilter: NotificationSaasFilter = "all"
): NotificationFeed {
  const filtered = filterNotifications(allItems, filter, saasFilter);
  const paged = paginateNotifications(filtered, page, limit);
  return {
    success: true,
    items: paged.items,
    page: paged.page,
    limit,
    total: paged.total,
    totalPages: paged.totalPages,
    filter,
    saasFilter,
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
  const saasFilter = parseNotificationSaasFilter(
    typeof value.saasFilter === "string" ? value.saasFilter : "all"
  );
  return {
    success: true,
    items,
    page,
    limit,
    total,
    totalPages,
    filter,
    saasFilter,
    unreadCount,
  };
}
