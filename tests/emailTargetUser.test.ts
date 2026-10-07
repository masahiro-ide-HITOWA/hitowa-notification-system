import { describe, expect, it } from "vitest";

import { parseEmailNotification } from "../apps/web/lib/email-parser";
import {
  selectIngestPortalUserIds,
} from "../apps/web/lib/email-target-user";

describe("shared notification inbox recipient", () => {
  it("reads the forwarded internal address instead of my-notification@hitowa.com", () => {
    const parsed = parseEmailNotification({
      from: "noreply@kaonavi.jp",
      to: "my-notification@hitowa.com",
      subject: "Fwd: 【カオナビ】評価シート",
      body: "-------- Forwarded message --------\nTo: masahiro-ide@hitowa.com\n提出してください",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.notification.recipientEmail).toBe("masahiro-ide@hitowa.com");
    expect(parsed.notification.sourceRecipient).toBe("my-notification@hitowa.com");
  });

  it("uses a personal Cc when the shared inbox has no forwarded To", () => {
    const parsed = parseEmailNotification({
      to: "my-notification@hitowa.com",
      cc: "staff@gr.hitowa.com",
      subject: "お知らせ",
      body: "共有受信箱への案内です",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.notification.recipientEmail).toBe("staff@gr.hitowa.com");
    }
  });
});

describe("selectIngestPortalUserIds", () => {
  const shared = {
    recipientEmail: "my-notification@hitowa.com",
    sourceRecipient: "my-notification@hitowa.com",
    mappedRecipientId: null,
    sharedInboxMappedId: null,
    envFallbackIds: [] as string[],
    allMappedIds: ["user-a", "user-b"],
  };

  it("keeps a mapped personal recipient", () => {
    expect(
      selectIngestPortalUserIds({ ...shared, recipientEmail: "masahiro-ide@hitowa.com", mappedRecipientId: "00400611" })
    ).toEqual(["00400611"]);
  });

  it("uses the env fallback, then the shared mapping, then every mapped user", () => {
    expect(selectIngestPortalUserIds({ ...shared, envFallbackIds: ["fallback-user"] })).toEqual(["fallback-user"]);
    expect(selectIngestPortalUserIds({ ...shared, sharedInboxMappedId: "shared-user" })).toEqual(["shared-user"]);
    expect(selectIngestPortalUserIds(shared)).toEqual(["user-a", "user-b"]);
  });

  it("does not fan out mail that was not delivered through the shared inbox", () => {
    expect(
      selectIngestPortalUserIds({
        ...shared,
        recipientEmail: "unknown@hitowa.com",
        sourceRecipient: undefined,
      })
    ).toEqual([]);
  });
});
