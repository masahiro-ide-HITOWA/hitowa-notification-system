import { describe, expect, it } from "vitest";

import {
  beginUnreadCountLoad,
  decrementUnreadNotificationCount,
  getUnreadNotificationCount,
  replaceUnreadNotificationCount,
} from "../apps/web/lib/use-unread-notification-count";

describe("unread notification count", () => {
  it("keeps a local decrement ahead of a stale server response", () => {
    const loaded = beginUnreadCountLoad();
    replaceUnreadNotificationCount(3, loaded);
    expect(getUnreadNotificationCount()).toBe(3);

    const stale = beginUnreadCountLoad();
    decrementUnreadNotificationCount();
    replaceUnreadNotificationCount(3, stale);
    expect(getUnreadNotificationCount()).toBe(2);
  });
});
