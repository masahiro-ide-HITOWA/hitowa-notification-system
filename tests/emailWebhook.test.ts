import { describe, expect, it } from "vitest";

import { parseEmailNotification } from "../apps/web/lib/email-parser";
import {
  createNotificationFromEmail,
  isDynamoTableMissing,
  resolvePortalUserIdFromMappings,
} from "../apps/web/lib/email-notification";

describe("parseEmailNotification", () => {
  it("detects カオナビ from the sender domain and subject", () => {
    const parsed = parseEmailNotification({
      from: "noreply@kaonavi.jp",
      to: "mei-sei@hitowa.com",
      subject: "【カオナビ】評価シート提出のお願い",
      body: "評価シートの提出期限が近づいています。 https://p.kaonavi.jp/member/evaluations/2026",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.notification.systemName).toBe("カオナビ");
      expect(parsed.notification.recipientEmail).toBe("mei-sei@hitowa.com");
      expect(parsed.notification.title).toBe("評価シート提出のお願い");
      expect(parsed.notification.body).toContain("提出期限");
      expect(parsed.notification.actionUrl).toBe("https://p.kaonavi.jp/member/evaluations/2026");
    }
  });

  it("detects TOKIUM from keywords", () => {
    const parsed = parseEmailNotification({
      from: "alert@tokium.jp",
      to: "taro@hitowa.com",
      subject: "【TOKIUM】経費承認依頼",
      text: "承認待ちの経費申請があります。",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.notification.systemName).toBe("TOKIUM");
    }
  });

  it("detects クラウドハウス労務 from the subject", () => {
    const parsed = parseEmailNotification({
      from: "info@example.com",
      to: "hanako@hitowa.com",
      subject: "【クラウドハウス労務】年末調整",
      body: "書類を提出してください。",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.notification.systemName).toBe("クラウドハウス労務");
    }
  });

  it("falls back to 全社ポータル", () => {
    const parsed = parseEmailNotification({
      from: "portal@hitowa.com",
      recipientEmail: "mei-sei@hitowa.com",
      subject: "メンテナンスのお知らせ",
      body: "本日22時から停止します。",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.notification.systemName).toBe("全社ポータル");
    }
  });

  it("rejects a payload without a recipient", () => {
    const parsed = parseEmailNotification({
      from: "noreply@kaonavi.jp",
      subject: "評価",
      body: "本文",
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("email notification persistence helpers", () => {
  it("resolves portalUserId from HitowaUserMappings attributes.email", () => {
    const portalUserId = resolvePortalUserIdFromMappings(
      [
        {
          portalUserId: "00400611",
          status: "COMPLETED",
          attributes: { email: "mei-sei@hitowa.com" },
        },
      ],
      "mei-sei@hitowa.com"
    );
    expect(portalUserId).toBe("00400611");
  });

  it("returns null when no attributes.email matches so the API can 404", () => {
    expect(
      resolvePortalUserIdFromMappings(
        [{ portalUserId: "00400611", attributes: { email: "other@hitowa.com" } }],
        "mei-sei@hitowa.com"
      )
    ).toBeNull();
    expect(resolvePortalUserIdFromMappings([], "mei-sei@hitowa.com")).toBeNull();
    expect(resolvePortalUserIdFromMappings(undefined, "mei-sei@hitowa.com")).toBeNull();
  });

  it("detects a missing DynamoDB table error", () => {
    const error = new Error("Requested resource not found");
    error.name = "ResourceNotFoundException";
    expect(isDynamoTableMissing(error)).toBe(true);
    expect(isDynamoTableMissing(new Error("timeout"))).toBe(false);
  });

  it("builds an unread NotificationItem for DynamoDB", () => {
    const parsed = parseEmailNotification({
      from: "noreply@kaonavi.jp",
      to: "mei-sei@hitowa.com",
      subject: "【カオナビ】リマインド",
      body: "提出してください。 https://p.kaonavi.jp/open",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const item = createNotificationFromEmail(
      parsed.notification,
      "00400611",
      "ntf-test-1",
      "2026-09-18T01:00:00.000Z"
    );
    expect(item.actionUrl).toBe("https://p.kaonavi.jp/open");
    expect(item).toMatchObject({
      id: "ntf-test-1",
      portalUserId: "00400611",
      systemName: "カオナビ",
      title: "リマインド",
      isRead: false,
      createdAt: "2026-09-18T01:00:00.000Z",
    });
  });
});
