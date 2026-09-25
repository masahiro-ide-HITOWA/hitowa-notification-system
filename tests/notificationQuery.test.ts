import { describe, expect, it } from "vitest";

import {
  buildNotificationFeed,
  filterNotifications,
  paginateNotifications,
  parseNotificationFilter,
  parsePositiveInt,
} from "../apps/web/lib/notification-query";
import {
  NOTIFICATION_TTL_READ_SECONDS,
  NOTIFICATION_TTL_UNREAD_SECONDS,
  readNotificationExpiresAt,
  unreadNotificationExpiresAt,
} from "../apps/web/lib/notification-ttl";
import { createNotificationFromEmail } from "../apps/web/lib/email-notification";
import { parseEmailNotification } from "../apps/web/lib/email-parser";
import type { NotificationItem } from "../apps/web/lib/notifications";

function sample(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: "ntf-1",
    portalUserId: "00400611",
    systemName: "カオナビ",
    title: "評価",
    body: "本文",
    isRead: false,
    createdAt: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("notification TTL", () => {
  it("sets unread TTL to 90 days and read TTL to 30 days in epoch seconds", () => {
    const now = Date.parse("2026-09-25T00:00:00.000Z");
    expect(unreadNotificationExpiresAt(now)).toBe(Math.floor(now / 1000) + NOTIFICATION_TTL_UNREAD_SECONDS);
    expect(readNotificationExpiresAt(now)).toBe(Math.floor(now / 1000) + NOTIFICATION_TTL_READ_SECONDS);
    expect(NOTIFICATION_TTL_UNREAD_SECONDS).toBe(90 * 24 * 60 * 60);
    expect(NOTIFICATION_TTL_READ_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it("persists expiresAt on new email notifications", () => {
    const parsed = parseEmailNotification({
      from: "noreply@kaonavi.jp",
      to: "mei-sei@hitowa.com",
      subject: "【カオナビ】TTL",
      body: "本文",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const now = Date.parse("2026-09-25T01:00:00.000Z");
    const item = createNotificationFromEmail(
      parsed.notification,
      "00400611",
      "ntf-ttl",
      "2026-09-25T01:00:00.000Z",
      now
    );
    expect(item.expiresAt).toBe(unreadNotificationExpiresAt(now));
  });
});

describe("notification query", () => {
  it("parses filter and page query values", () => {
    expect(parseNotificationFilter("unread")).toBe("unread");
    expect(parseNotificationFilter("nope")).toBe("all");
    expect(parsePositiveInt("2", 1, 50)).toBe(2);
    expect(parsePositiveInt("0", 10, 50)).toBe(10);
  });

  it("filters unread/read and paginates 10 per page", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      sample({ id: `ntf-${index}`, isRead: index % 2 === 0, title: `n${index}` })
    );
    expect(filterNotifications(items, "unread")).toHaveLength(6);
    const page1 = paginateNotifications(items, 1, 10);
    expect(page1.items).toHaveLength(10);
    expect(page1.totalPages).toBe(2);
    const feed = buildNotificationFeed(items, "all", 2, 10);
    expect(feed.items).toHaveLength(2);
    expect(feed.page).toBe(2);
    expect(feed.unreadCount).toBe(6);
  });
});
