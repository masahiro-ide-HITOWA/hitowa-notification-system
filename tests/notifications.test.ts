import { describe, expect, it } from "vitest";

import {
  countUnreadNotifications,
  getNotificationsForUser,
  parseNotificationList,
  parseNotificationsPortalUserId,
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
});
