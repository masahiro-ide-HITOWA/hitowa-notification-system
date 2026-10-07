import { fetchSaasInboxReport, markSaasInboxMessagesSeen, type EmailFetcherDeps } from "@/lib/email-fetcher";
import { ingestParsedEmailNotification } from "@/lib/email-ingest";
import { loadNotificationSystemRules } from "@/lib/notification-system-cache";
import type { NotificationSystemRule } from "@/lib/notification-system-rule";
import { MailCredentialsError } from "@/lib/secrets";
import { isMailImapError } from "@/lib/mail-imap-model";
import type { ParsedEmailNotification } from "@/lib/email-parser";

export interface FetchEmailsJobError {
  message: string;
  detail?: string;
  recipientEmail?: string;
}

export interface FetchEmailsJobResult {
  success: boolean;
  connection: "ok" | "failed";
  unreadCount: number | null;
  fetched: number;
  parsed: number;
  ingested: number;
  skipped: number;
  unseenCount: number | null;
  seenCount: number | null;
  message: string;
  notifications: ParsedEmailNotification[];
  errors: FetchEmailsJobError[];
}

export async function runFetchEmailsJob(
  folder = "INBOX",
  limit = 20,
  deps?: EmailFetcherDeps,
  rules?: NotificationSystemRule[]
): Promise<FetchEmailsJobResult> {
  const activeRules = rules ?? (await loadNotificationSystemRules());
  const report = await fetchSaasInboxReport(folder, limit, deps);
  const errors: FetchEmailsJobError[] = report.parseErrors.map((item) => ({
    message: `uid=${item.uid} のパースに失敗しました`,
    detail: item.message,
  }));
  let ingested = 0;
  let skipped = 0;
  const seenUids: number[] = [];

  for (const notification of report.notifications) {
    try {
      const result = await ingestParsedEmailNotification(notification, activeRules);
      if (result.ok || result.duplicate) {
        if (result.ok) {
          ingested += 1;
        } else {
          skipped += 1;
        }
        if (typeof notification.imapUid === "number") {
          seenUids.push(notification.imapUid);
        }
      } else if (result.skipped) {
        skipped += 1;
      } else {
        errors.push({
          message: result.message,
          recipientEmail: notification.recipientEmail,
        });
      }
    } catch (error) {
      errors.push({
        message: "通知の取り込みに失敗しました",
        detail: error instanceof Error ? error.message : String(error),
        recipientEmail: notification.recipientEmail,
      });
    }
  }

  if (seenUids.length > 0) {
    await markSaasInboxMessagesSeen(seenUids, folder, deps);
  }

  const parsed = report.notifications.length;
  return {
    success: errors.length === 0,
    connection: "ok",
    unreadCount: report.unreadFetched ?? report.unseenCount,
    fetched: report.fetched,
    parsed,
    ingested,
    skipped,
    unseenCount: report.unseenCount,
    seenCount: report.seenCount,
    message:
      errors.length === 0
        ? `IMAP接続に成功しました。未読 ${report.unreadFetched ?? report.unseenCount ?? 0} 通、取り込み ${ingested} 件、対象外 ${skipped} 件です。`
        : `IMAP接続には成功しましたが、${errors.length} 件の取得・取り込みエラーがあります。`,
    notifications: report.notifications,
    errors,
  };
}

function failedJobBody(message: string, errors: FetchEmailsJobError[]): FetchEmailsJobResult {
  return {
    success: false,
    connection: "failed",
    unreadCount: null,
    fetched: 0,
    parsed: 0,
    ingested: 0,
    skipped: 0,
    unseenCount: null,
    seenCount: null,
    message,
    notifications: [],
    errors,
  };
}

export function fetchEmailsJobErrorResponse(error: unknown): {
  status: number;
  body: FetchEmailsJobResult;
} {
  if (isMailImapError(error)) {
    const status = error.code === "CONFIG_MISSING" ? 404 : 502;
    const message = error.detail ? `${error.message} (${error.detail})` : error.message;
    return {
      status,
      body: failedJobBody(message, [{ message: error.message, detail: error.detail ?? error.code }]),
    };
  }
  if (error instanceof MailCredentialsError) {
    return {
      status: 404,
      body: failedJobBody(error.message, [{ message: error.message, detail: error.detail }]),
    };
  }
  const message = error instanceof Error ? error.message : "メール受信ジョブに失敗しました";
  return {
    status: 500,
    body: failedJobBody(message, [{ message }]),
  };
}
