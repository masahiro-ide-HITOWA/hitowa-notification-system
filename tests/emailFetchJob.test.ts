import { beforeEach, describe, expect, it, vi } from "vitest";

import { MailImapError } from "../apps/web/lib/mail-imap-model";

const fetchSaasInboxReport = vi.fn();
const markSaasInboxMessagesSeen = vi.fn();
const ingestParsedEmailNotification = vi.fn();

vi.mock("@/lib/email-fetcher", () => ({
  fetchSaasInboxReport: (...args: unknown[]) => fetchSaasInboxReport(...args),
  markSaasInboxMessagesSeen: (...args: unknown[]) => markSaasInboxMessagesSeen(...args),
}));

vi.mock("@/lib/email-ingest", () => ({
  ingestParsedEmailNotification: (...args: unknown[]) => ingestParsedEmailNotification(...args),
}));

vi.mock("@/lib/notification-system-cache", () => ({
  loadNotificationSystemRules: async () => [],
}));

describe("fetch email job debug response", () => {
  beforeEach(() => {
    fetchSaasInboxReport.mockReset();
    markSaasInboxMessagesSeen.mockReset();
    ingestParsedEmailNotification.mockReset();
  });

  it("returns connection failure details for IMAP errors", async () => {
    const { fetchEmailsJobErrorResponse } = await import("../apps/web/lib/email-fetch-job");
    const failure = fetchEmailsJobErrorResponse(
      new MailImapError(
        "CONNECTION_FAILED",
        "IMAP接続に失敗しました: ECONNREFUSED",
        "host=imap.example.com; port=993; user=my-notification@hitowa.com"
      )
    );
    expect(failure.status).toBe(502);
    expect(failure.body.connection).toBe("failed");
    expect(failure.body.unreadCount).toBeNull();
    expect(failure.body.message).toContain("ECONNREFUSED");
    expect(failure.body.errors[0]?.detail).toContain("my-notification@hitowa.com");
  });

  it("returns unread count and ingest errors after a successful connection", async () => {
    fetchSaasInboxReport.mockResolvedValue({
      mailboxExists: 2,
      unseenCount: 1,
      seenCount: 1,
      unreadFetched: 1,
      fetched: 1,
      notifications: [
        {
          systemName: "カオナビ",
          recipientEmail: "my-notification@hitowa.com",
          title: "評価",
          body: "本文",
          actionUrl: "https://p.kaonavi.jp/open",
        },
      ],
      parseErrors: [{ uid: 9, message: "RFC822 source missing" }],
    });
    ingestParsedEmailNotification.mockResolvedValue({
      ok: false,
      status: 404,
      message: "宛先メールに対応するユーザーが見つかりません",
    });
    const { runFetchEmailsJob } = await import("../apps/web/lib/email-fetch-job");
    const result = await runFetchEmailsJob();
    expect(result.connection).toBe("ok");
    expect(result.unreadCount).toBe(1);
    expect(result.success).toBe(false);
    expect(result.errors.map((error) => error.message)).toEqual([
      "uid=9 のパースに失敗しました",
      "宛先メールに対応するユーザーが見つかりません",
    ]);
    expect(result.errors[1]?.recipientEmail).toBe("my-notification@hitowa.com");
    expect(markSaasInboxMessagesSeen).not.toHaveBeenCalled();
  });

  it("marks IMAP messages seen only after a successful or duplicate save", async () => {
    fetchSaasInboxReport.mockResolvedValue({
      mailboxExists: 2,
      unseenCount: 2,
      seenCount: null,
      unreadFetched: 2,
      fetched: 2,
      notifications: [
        { systemName: "カオナビ", recipientEmail: "a@hitowa.com", title: "評価", body: "本文", imapUid: 4 },
        { systemName: "TOKIUM", recipientEmail: "a@hitowa.com", title: "経費", body: "本文", imapUid: 5 },
      ],
      parseErrors: [],
    });
    ingestParsedEmailNotification
      .mockResolvedValueOnce({ ok: true, notificationId: "n1", portalUserId: "00400611" })
      .mockResolvedValueOnce({ ok: false, skipped: true, duplicate: true, status: 200, message: "取り込み済み" });
    const { runFetchEmailsJob } = await import("../apps/web/lib/email-fetch-job");
    const result = await runFetchEmailsJob();
    expect(result.ingested).toBe(1);
    expect(result.skipped).toBe(1);
    expect(markSaasInboxMessagesSeen).toHaveBeenCalledWith([4, 5], "INBOX", undefined);
  });
});
