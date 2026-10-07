import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearNotificationSystemRuleCache,
  loadNotificationSystemRules,
} from "../apps/web/lib/notification-system-cache";
import {
  matchNotificationSystem,
  parseNotificationSystemRules,
  type NotificationSystemRule,
} from "../apps/web/lib/notification-system-rule";

const kaonaviRule: NotificationSystemRule = {
  systemName: "カオナビ",
  fromAddresses: ["noreply@kaonavi.jp"],
  subjectPrefixes: ["【カオナビ】"],
  enabled: true,
};

const tokiumRules: NotificationSystemRule[] = [
  {
    systemName: "TOKIUM",
    fromAddresses: ["noreply@tokium.jp"],
    subjectPrefixes: ["【TOKIUM経費精算】"],
    enabled: true,
  },
  {
    systemName: "TOKIUM",
    fromAddresses: ["noreply-invoice@tokium.jp"],
    subjectPrefixes: ["【TOKIUMインボイス】"],
    enabled: true,
  },
];

const kaonaviMail = {
  systemName: "カオナビ",
  from: "noreply@kaonavi.jp",
  subject: "【カオナビ】評価",
  recipientEmail: "mei-sei@hitowa.com",
  title: "評価",
  body: "提出してください",
};

const googleMail = {
  systemName: "全社ポータル",
  from: "no-reply@accounts.google.com",
  subject: "セキュリティ通知",
  recipientEmail: "mei-sei@hitowa.com",
  title: "セキュリティ通知",
  body: "新しいログインがありました",
};

describe("notification system rules", () => {
  beforeEach(() => {
    clearNotificationSystemRuleCache();
  });

  it("requires both the sender address and the subject prefix on the same row", () => {
    expect(matchNotificationSystem([kaonaviRule], kaonaviMail)?.systemName).toBe("カオナビ");
    expect(matchNotificationSystem([kaonaviRule], googleMail)).toBeNull();
    expect(
      matchNotificationSystem([kaonaviRule], { ...kaonaviMail, from: "other@kaonavi.jp" })
    ).toBeNull();
    expect(
      matchNotificationSystem([kaonaviRule], { ...kaonaviMail, subject: "評価シートのお願い" })
    ).toBeNull();
    expect(
      matchNotificationSystem([kaonaviRule], {
        ...googleMail,
        body: "問い合わせは noreply@kaonavi.jp です。件名は【カオナビ】評価",
        subject: "【カオナビ】評価",
      })
    ).toBeNull();
  });

  it("matches a forwarded sender and a subject after Re: or Fwd:", () => {
    const forwarded = {
      from: "mei-sei@hitowa.com",
      subject: "Re: Fwd: 【TOKIUM経費精算】申請が届きました",
      body: [
        "---------- Forwarded message ---------",
        "From: TOKIUM <noreply@tokium.jp>",
        "To: mei-sei@hitowa.com",
        "",
        "申請をご確認ください。",
      ].join("\n"),
    };
    expect(matchNotificationSystem(tokiumRules, forwarded)?.subjectPrefixes).toEqual([
      "【TOKIUM経費精算】",
    ]);
    expect(
      matchNotificationSystem(tokiumRules, {
        from: "noreply-invoice@tokium.jp",
        subject: "【TOKIUMインボイス】承認依頼",
      })?.subjectPrefixes
    ).toEqual(["【TOKIUMインボイス】"]);
  });

  it("ignores disabled rules and rows that omit an address or a prefix", () => {
    const disabled: NotificationSystemRule = { ...kaonaviRule, enabled: false };
    const addressOnly: NotificationSystemRule = { ...kaonaviRule, subjectPrefixes: [] };
    expect(matchNotificationSystem([disabled, addressOnly], kaonaviMail)).toBeNull();
  });

  it("parses sender addresses and subject prefixes from DynamoDB", () => {
    const rules = parseNotificationSystemRules([
      {
        systemName: " TOKIUM ",
        fromAddresses: "noreply@tokium.jp, alert@tokium.jp",
        subjectPrefix: "【TOKIUM経費精算】",
        enabled: "false",
      },
      { fromAddresses: ["noreply@tokium.jp"] },
    ]);
    expect(rules).toEqual([
      {
        systemName: "TOKIUM",
        fromAddresses: ["noreply@tokium.jp", "alert@tokium.jp"],
        subjectPrefixes: ["【TOKIUM経費精算】"],
        enabled: false,
      },
    ]);
  });

  it("loads rules once and reuses the in-memory cache until TTL", async () => {
    const load = vi.fn(async () => [
      {
        systemName: "カオナビ",
        fromAddresses: ["noreply@kaonavi.jp"],
        subjectPrefixes: ["【カオナビ】"],
        enabled: true,
      },
    ]);
    const first = await loadNotificationSystemRules(1_000, load);
    const second = await loadNotificationSystemRules(1_000 + 60_000, load);
    expect(second).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    clearNotificationSystemRuleCache();
    await loadNotificationSystemRules(1_000 + 60_000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("matches nothing when the table is empty or unavailable", async () => {
    const empty = vi.fn(async () => []);
    await expect(loadNotificationSystemRules(1_000, empty)).resolves.toEqual([]);
    clearNotificationSystemRuleCache();
    const failing = vi.fn(async () => {
      throw new Error("ResourceNotFoundException");
    });
    await expect(loadNotificationSystemRules(2_000, failing)).resolves.toEqual([]);
  });
});
