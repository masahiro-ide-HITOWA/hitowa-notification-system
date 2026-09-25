import { fetchSaasInboxReport, type EmailFetcherDeps } from "@/lib/email-fetcher";
import { ingestParsedEmailNotification } from "@/lib/email-ingest";
import { isMailImapError } from "@/lib/mail-imap-model";
import type { ParsedEmailNotification } from "@/lib/email-parser";

export interface FetchEmailsJobError {
  message: string;
  detail?: string;
  recipientEmail?: string;
}

export interface FetchEmailsJobResult {
  success: boolean;
  fetched: number;
  parsed: number;
  ingested: number;
  unseenCount: number | null;
  seenCount: number | null;
  notifications: ParsedEmailNotification[];
  errors: FetchEmailsJobError[];
}

export async function runFetchEmailsJob(
  folder = "INBOX",
  limit = 20,
  deps?: EmailFetcherDeps
): Promise<FetchEmailsJobResult> {
  const report = await fetchSaasInboxReport(folder, limit, deps);
  const errors: FetchEmailsJobError[] = report.parseErrors.map((item) => ({
    message: `uid=${item.uid} のパースに失敗しました`,
    detail: item.message,
  }));
  let ingested = 0;

  for (const notification of report.notifications) {
    try {
      const result = await ingestParsedEmailNotification(notification);
      if (result.ok) {
        ingested += 1;
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

  return {
    success: errors.length === 0,
    fetched: report.fetched,
    parsed: report.notifications.length,
    ingested,
    unseenCount: report.unseenCount,
    seenCount: report.seenCount,
    notifications: report.notifications,
    errors,
  };
}

export function fetchEmailsJobErrorResponse(error: unknown): {
  status: number;
  body: { success: false; message: string; errors: FetchEmailsJobError[] };
} {
  if (isMailImapError(error)) {
    const status = error.code === "CONFIG_MISSING" ? 404 : 502;
    return {
      status,
      body: {
        success: false,
        message: error.message,
        errors: [{ message: error.message, detail: error.code }],
      },
    };
  }
  const message = error instanceof Error ? error.message : "メール受信ジョブに失敗しました";
  return {
    status: 500,
    body: { success: false, message, errors: [{ message }] },
  };
}
