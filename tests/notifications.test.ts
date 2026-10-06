import { describe, expect, it } from "vitest";

import {
  countUnreadNotifications,
  formatUnreadBadge,
  notificationsFromDynamoItems,
  parseNotificationList,
  parseNotificationsPortalUserId,
  sortNotificationsByCreatedAtDesc,
  type NotificationItem,
} from "../apps/web/lib/notifications";

const inbox: NotificationItem[] = [
  {
    id: "newer",
    portalUserId: "user-1",
    systemName: "カオナビ",
    title: "評価シート提出リマインド",
    body: "提出してください。",
    isRead: false,
    createdAt: "2026-09-17T09:00:00+09:00",
  },
  {
    id: "older",
    portalUserId: "user-1",
    systemName: "TOKIUM",
    title: "経費申請",
    body: "承認してください。",
    isRead: false,
    createdAt: "2026-09-16T14:30:00+09:00",
  },
];

describe("notifications", () => {
  it("counts unread items", () => {
    expect(countUnreadNotifications(inbox)).toBe(2);
    expect(formatUnreadBadge(2)).toBe("2");
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-1)).toBeNull();
  });

  it("prefers x-user-id over the query parameter", () => {
    expect(parseNotificationsPortalUserId("header-user", "query-user")).toBe("header-user");
    expect(parseNotificationsPortalUserId(null, "query-user")).toBe("query-user");
  });

  it("parses a notification JSON array without any", () => {
    const parsed = parseNotificationList(inbox);
    expect(parsed).not.toBeNull();
    expect(parsed?.[0]?.title).toContain("評価");
  });

  it("sorts DynamoDB items by createdAt descending", () => {
    const items = notificationsFromDynamoItems([
      {
        id: "old",
        portalUserId: "user-1",
        systemName: "全社ポータル",
        title: "古い",
        body: "old",
        isRead: true,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "new",
        portalUserId: "user-1",
        systemName: "カオナビ",
        title: "新しい",
        body: "new",
        isRead: false,
        createdAt: "2026-09-18T00:00:00.000Z",
      },
      { skip: true },
    ]);
    expect(items.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("maps DynamoDB url onto actionUrl", () => {
    const items = notificationsFromDynamoItems([
      {
        id: "new",
        portalUserId: "user-1",
        systemName: "カオナビ",
        title: "新しい",
        body: "new",
        isRead: false,
        createdAt: "2026-09-18T00:00:00.000Z",
        url: "https://p.kaonavi.jp/x",
      },
    ]);
    expect(items[0]?.actionUrl).toBe("https://p.kaonavi.jp/x");
  });

  it("returns an empty list when DynamoDB has no matching items", () => {
    expect(notificationsFromDynamoItems([])).toEqual([]);
    expect(notificationsFromDynamoItems(undefined)).toEqual([]);
  });

  it("sorts newest notifications first", () => {
    const items = sortNotificationsByCreatedAtDesc(inbox);
    expect(items[0]?.id).toBe("newer");
  });
});
