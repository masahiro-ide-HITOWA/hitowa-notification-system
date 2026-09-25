import { describe, expect, it } from "vitest";

import {
  countUnreadNotifications,
  formatUnreadBadge,
  getNotificationsForUser,
  notificationsFromDynamoItems,
  parseNotificationList,
  parseNotificationsPortalUserId,
  sortNotificationsByCreatedAtDesc,
} from "../apps/web/lib/notifications";

describe("notifications", () => {
  it("returns only the signed-in user's notifications", () => {
    const items = getNotificationsForUser("00400611");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.portalUserId === "00400611")).toBe(true);
    expect(items.some((item) => item.systemName === "カオナビ")).toBe(true);
    expect(items.some((item) => item.systemName === "TOKIUM")).toBe(true);
  });

  it("excludes other users' notifications", () => {
    const items = getNotificationsForUser("00400611");
    expect(items.some((item) => item.id === "ntf-other-user")).toBe(false);
  });

  it("counts unread items", () => {
    const items = getNotificationsForUser("00400611");
    expect(countUnreadNotifications(items)).toBe(2);
    expect(formatUnreadBadge(2)).toBe("2");
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-1)).toBeNull();
  });

  it("prefers x-user-id over the query parameter", () => {
    expect(parseNotificationsPortalUserId("header-user", "query-user")).toBe("header-user");
    expect(parseNotificationsPortalUserId(null, "query-user")).toBe("query-user");
  });

  it("parses a notification JSON array without any", () => {
    const parsed = parseNotificationList(getNotificationsForUser("00400611"));
    expect(parsed).not.toBeNull();
    expect(parsed?.[0]?.title).toContain("評価");
  });

  it("sorts DynamoDB items by createdAt descending", () => {
    const items = notificationsFromDynamoItems([
      {
        id: "old",
        portalUserId: "00400611",
        systemName: "全社ポータル",
        title: "古い",
        body: "old",
        isRead: true,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "new",
        portalUserId: "00400611",
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
        portalUserId: "00400611",
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

  it("keeps mock inbox newest-first", () => {
    const items = sortNotificationsByCreatedAtDesc(getNotificationsForUser("00400611"));
    expect(items[0]?.createdAt >= (items[1]?.createdAt ?? "")).toBe(true);
  });
});
