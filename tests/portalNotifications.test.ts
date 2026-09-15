import { describe, expect, it } from "vitest";

import {
  buildSaasPath,
  getPortalNotification,
  PORTAL_INBOX_ITEMS,
} from "../apps/web/lib/portal-notifications";

describe("portal notifications", () => {
  it("builds a local procedure path", () => {
    expect(buildSaasPath("kaonavi", "1")).toBe("/saas/kaonavi/1");
  });

  it("returns the matching inbox item", () => {
    const item = getPortalNotification("tokium", "2");
    expect(item?.title).toContain("差し戻し");
    expect(item?.actionUrl).toBe("/saas/tokium/2");
  });

  it("returns undefined for unknown ids", () => {
    expect(getPortalNotification("kaonavi", "999")).toBeUndefined();
  });

  it("keeps every inbox action on a local saas path", () => {
    for (const item of PORTAL_INBOX_ITEMS) {
      expect(item.actionUrl).toBe(buildSaasPath(item.source, item.id));
    }
  });
});
