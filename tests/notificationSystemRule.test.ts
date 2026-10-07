import { beforeEach, describe, expect, it, vi } from "vitest";

import { docClient } from "../apps/web/lib/dynamodb";
import { ingestParsedEmailNotification } from "../apps/web/lib/email-ingest";
import { runFetchEmailsJob } from "../apps/web/lib/email-fetch-job";
import {
  clearNotificationSystemRuleCache,
  loadNotificationSystemRules,
  notificationSystemTableName,
} from "../apps/web/lib/notification-system-cache";
import {
  BUILTIN_NOTIFICATION_SYSTEM_RULES,
  matchNotificationSystem,
  parseNotificationSystemRules,
  type NotificationSystemRule,
} from "../apps/web/lib/notification-system-rule";

const sendLinePushIfLinked = vi.fn();
const fetchSaasInboxReport = vi.fn();

vi.mock("@/lib/line-push", () => ({
  sendLinePushIfLinked: (...args: unknown[]) => sendLinePushIfLinked(...args),
}));

vi.mock("@/lib/email-fetcher", () => ({
  fetchSaasInboxReport: (...args: unknown[]) => fetchSaasInboxReport(...args),
}));

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
    sendLinePushIfLinked.mockReset();
  });

  it("matches built-in systems and skips mail outside the rules", () => {
    expect(matchNotificationSystem(BUILTIN_NOTIFICATION_SYSTEM_RULES, kaonaviMail)?.systemName).toBe(
      "カオナビ"
    );
    expect(matchNotificationSystem(BUILTIN_NOTIFICATION_SYSTEM_RULES, googleMail)).toBeNull();
  });

  it("ignores disabled rules and empty keyword lists", () => {
    const disabled: NotificationSystemRule = {
      ...BUILTIN_NOTIFICATION_SYSTEM_RULES[0],
      enabled: false,
    };
    const empty: NotificationSystemRule = {
      systemName: "空",
      fromDomains: [],
      subjectKeywords: [""],
      bodyKeywords: [],
      enabled: true,
    };
    expect(matchNotificationSystem([disabled, empty], kaonaviMail)).toBeNull();
  });

  it("parses DynamoDB items including comma-separated keywords", () => {
    const rules = parseNotificationSystemRules([
      {
        systemName: " 新システム ",
        fromDomains: "example.com, alerts.example.com",
        subjectKeywords: ["申請"],
        enabled: "false",
      },
      { fromDomains: ["ignored.example"] },
    ]);
    expect(rules).toEqual([
      {
        systemName: "新システム",
        fromDomains: ["example.com", "alerts.example.com"],
        subjectKeywords: ["申請"],
        bodyKeywords: [],
        enabled: false,
      },
    ]);
  });

  it("loads rules once and reuses the in-memory cache until TTL", async () => {
    const load = vi.fn(async () => [
      {
        systemName: "カオナビ",
        fromDomains: ["kaonavi.jp"],
        subjectKeywords: [],
        bodyKeywords: [],
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

  it("falls back to built-in rules when the table is empty or unavailable", async () => {
    const empty = vi.fn(async () => []);
    await expect(loadNotificationSystemRules(1_000, empty)).resolves.toBe(BUILTIN_NOTIFICATION_SYSTEM_RULES);
    clearNotificationSystemRuleCache();
    const failing = vi.fn(async () => {
      throw new Error("ResourceNotFoundException");
    });
    await expect(loadNotificationSystemRules(2_000, failing)).resolves.toBe(BUILTIN_NOTIFICATION_SYSTEM_RULES);
  });

  it("does not save or push LINE for mail that matches no rule", async () => {
    const send = vi.spyOn(docClient, "send").mockResolvedValue({} as never);
    const result = await ingestParsedEmailNotification(googleMail, BUILTIN_NOTIFICATION_SYSTEM_RULES);
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(send).not.toHaveBeenCalled();
    expect(sendLinePushIfLinked).not.toHaveBeenCalled();
    send.mockRestore();
  });

  it("saves a matching mail and sends LINE only after the save", async () => {
    const order: string[] = [];
    const send = vi.spyOn(docClient, "send").mockImplementation(async (command) => {
      order.push(command.constructor.name);
      if (command.constructor.name === "ScanCommand") {
        return {
          Items: [
            {
              portalUserId: "00400611",
              status: "COMPLETED",
              attributes: { email: "mei-sei@hitowa.com" },
            },
          ],
        } as never;
      }
      return {} as never;
    });
    sendLinePushIfLinked.mockImplementation(async () => {
      order.push("line");
      return { pushed: true };
    });
    const result = await ingestParsedEmailNotification(kaonaviMail, BUILTIN_NOTIFICATION_SYSTEM_RULES);
    expect(result.ok).toBe(true);
    expect(order).toEqual(["ScanCommand", "PutCommand", "line"]);
    send.mockRestore();
  });

  it("reads notification rules once per fetch batch and skips unmatched mail", async () => {
    fetchSaasInboxReport.mockResolvedValue({
      mailboxExists: 1,
      unseenCount: 1,
      seenCount: 0,
      unreadFetched: 1,
      fetched: 1,
      notifications: [googleMail, kaonaviMail],
      parseErrors: [],
    });
    const send = vi.spyOn(docClient, "send").mockImplementation(async (command) => {
      const input = (command as { input?: { TableName?: string } }).input;
      if (input?.TableName === notificationSystemTableName()) {
        return {
          Items: [
            {
              systemName: "カオナビ",
              fromDomains: ["kaonavi.jp"],
              subjectKeywords: ["カオナビ"],
              enabled: true,
            },
          ],
        } as never;
      }
      if (command.constructor.name === "ScanCommand") {
        return {
          Items: [
            {
              portalUserId: "00400611",
              status: "COMPLETED",
              attributes: { email: "mei-sei@hitowa.com" },
            },
          ],
        } as never;
      }
      return {} as never;
    });
    sendLinePushIfLinked.mockResolvedValue({ pushed: true });
    const result = await runFetchEmailsJob();
    const systemScans = send.mock.calls.filter((call) => {
      const input = (call[0] as { input?: { TableName?: string } }).input;
      return input?.TableName === notificationSystemTableName();
    });
    expect(systemScans).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.ingested).toBe(1);
    expect(result.success).toBe(true);
    expect(sendLinePushIfLinked).toHaveBeenCalledTimes(1);
    send.mockRestore();
  });
});
