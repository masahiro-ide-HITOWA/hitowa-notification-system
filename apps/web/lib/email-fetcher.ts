import { type ImapClientLike } from "@/lib/mail-imap";
import { latestSequenceRange, MailImapError, type MailFetchedLike } from "@/lib/mail-imap-model";
import {
  createSaasImapClient,
  isSeenFlag,
  loadFetchedMessage,
  parseFetchedSource,
  searchMailboxUids,
} from "@/lib/email-fetcher-imap";
import { describeImapConnectionError } from "@/lib/email-imap-error";
import type { ParsedEmailNotification } from "@/lib/email-parser";
import { getMailCredentials, MailCredentialsError, type MailCredentials } from "@/lib/secrets";

export interface EmailFetcherDeps {
  getCredentials: () => Promise<MailCredentials>;
  createClient: (credentials: MailCredentials) => ImapClientLike;
}

export interface SaasInboxParseError {
  uid: number;
  message: string;
}

export interface SaasInboxFetchReport {
  mailboxExists: number;
  unseenCount: number | null;
  seenCount: number | null;
  fetched: number;
  notifications: ParsedEmailNotification[];
  parseErrors: SaasInboxParseError[];
}

const defaultDeps: EmailFetcherDeps = {
  getCredentials: () => getMailCredentials(),
  createClient: createSaasImapClient,
};

export async function fetchSaasInboxReport(
  folder = "INBOX",
  limit = 20,
  deps: EmailFetcherDeps = defaultDeps
): Promise<SaasInboxFetchReport> {
  let credentials: MailCredentials;
  try {
    credentials = await deps.getCredentials();
  } catch (error) {
    const detail =
      error instanceof MailCredentialsError
        ? error.detail
        : error instanceof Error
          ? error.message
          : String(error);
    console.error("[email-fetcher] credentials unavailable", detail, error);
    throw new MailImapError("CONFIG_MISSING", "メール受信用の資格情報を取得できません", detail);
  }

  const client = deps.createClient(credentials);
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const lock = await client.getMailboxLock(folder);
    try {
      return await collectInboxMessages(client, limit);
    } finally {
      lock.release();
    }
  } catch (error) {
    if (error instanceof MailImapError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "IMAP connection failed";
    const detail = describeImapConnectionError(error, {
      host: credentials.host,
      port: credentials.port,
      user: credentials.email,
      password: credentials.password,
    });
    console.error("[email-fetcher] IMAP connection failed", detail);
    throw new MailImapError("CONNECTION_FAILED", `IMAP接続に失敗しました: ${message}`, detail);
  } finally {
    if (connected) {
      try {
        await client.logout();
      } catch {
        // logout failure should not mask the original result
      }
    }
  }
}

async function collectInboxMessages(client: ImapClientLike, limit: number): Promise<SaasInboxFetchReport> {
  const mailboxExists = client.mailbox === false ? 0 : client.mailbox.exists;
  const unseenIds = await searchMailboxUids(client, { seen: false });
  const seenIds = await searchMailboxUids(client, { seen: true });
  console.log("[email-fetcher] imap search (includes SEEN / forwarded)", {
    mailboxExists,
    unseenCount: unseenIds?.length ?? null,
    seenCount: seenIds?.length ?? null,
  });

  const fromSearch = [...new Set([...(unseenIds ?? []), ...(seenIds ?? [])])].sort((a, b) => a - b);
  const uids = fromSearch.length > 0 ? fromSearch.slice(-limit) : [];
  const notifications: ParsedEmailNotification[] = [];
  const parseErrors: SaasInboxParseError[] = [];

  const consume = async (message: MailFetchedLike) => {
    console.log("[email-fetcher] message flags", { uid: message.uid, seen: isSeenFlag(message.flags) });
    const full = await loadFetchedMessage(client, message);
    if (!full) {
      parseErrors.push({ uid: message.uid, message: "fetchOne returned empty" });
      return;
    }
    const parsed = await parseFetchedSource(full);
    if (parsed.ok) {
      notifications.push(parsed.notification);
      return;
    }
    console.error("[email-fetcher] skip unparsable mail", { uid: full.uid, message: parsed.message });
    parseErrors.push({ uid: full.uid, message: parsed.message });
  };

  if (uids.length > 0) {
    for (const uid of uids) {
      await consume({ uid });
    }
  } else {
    const range = latestSequenceRange(mailboxExists, limit);
    if (range) {
      for await (const message of client.fetch(range, { uid: true, envelope: true, flags: true })) {
        await consume(message);
      }
    }
  }

  return {
    mailboxExists,
    unseenCount: unseenIds?.length ?? null,
    seenCount: seenIds?.length ?? null,
    fetched: notifications.length + parseErrors.length,
    notifications,
    parseErrors,
  };
}

export async function fetchSaasInboxEmails(
  folder = "INBOX",
  limit = 20,
  deps: EmailFetcherDeps = defaultDeps
): Promise<ParsedEmailNotification[]> {
  const report = await fetchSaasInboxReport(folder, limit, deps);
  return report.notifications;
}
