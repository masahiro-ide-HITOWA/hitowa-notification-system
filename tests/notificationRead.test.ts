import { describe, expect, it } from "vitest";

import {
  markItemsAsRead,
  parseMarkReadRequest,
} from "../apps/web/lib/notification-read";
import type { NotificationItem } from "../apps/web/lib/notifications";

const sample: NotificationItem = {
  id: "ntf-1",
  portalUserId: "00400611",
  systemName: "カオナビ",
  title: "評価リマインド",
  body: "提出してください",
  isRead: false,
  createdAt: "2026-09-18T00:00:00.000Z",
};

describe("parseMarkReadRequest", () => {
  it("prefers x-user-id and reads id from the body", () => {
    expect(
      parseMarkReadRequest({ id: "ntf-1", portalUserId: "body-user" }, "header-user")
    ).toEqual({ id: "ntf-1", portalUserId: "header-user" });
  });

  it("falls back to portalUserId in the JSON body", () => {
    expect(parseMarkReadRequest({ id: "ntf-1", portalUserId: "00400611" }, null)).toEqual({
      id: "ntf-1",
      portalUserId: "00400611",
    });
  });

  it("returns null when id is missing", () => {
    expect(parseMarkReadRequest({ portalUserId: "00400611" }, null)).toBeNull();
  });
});

describe("markItemsAsRead", () => {
  it("sets only the matching notification to isRead true", () => {
    const updated = markItemsAsRead(
      [sample, { ...sample, id: "ntf-2", title: "別件" }],
      "ntf-1"
    );
    expect(updated[0]?.isRead).toBe(true);
    expect(updated[1]?.isRead).toBe(false);
  });
});
