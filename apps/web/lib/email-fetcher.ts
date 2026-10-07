import { type ImapClientLike } from "@/lib/mail-imap";
import { latestSequenceRange, MailImapError, type MailFetchedLike } from "@/lib/mail-imap-model";
import {
  connectSaasClient,
  createSaasImapClient,
  isSeenFlag,
  loadFetchedMessage,
  markMailboxUidsSeen,
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
  unreadFetched: number | null;
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

  let client: ImapClientLike | null = null;
  try {
    client = await connectSaasClient(credentials, deps.createClient);
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
    if (client) {
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
  console.log("[email-fetcher] imap search UNSEEN only", {
    mailboxExists,
    unseenCount: unseenIds?.length ?? null,
  });

  const uids = unseenIds ? [...unseenIds].sort((a, b) => a - b).slice(-limit) : [];
  const notifications: ParsedEmailNotification[] = [];
  const parseErrors: SaasInboxParseError[] = [];
  let unreadFromFlags = 0;

  const consume = async (message: MailFetchedLike) => {
    const seen = isSeenFlag(message.flags);
    console.log("[email-fetcher] message flags", { uid: message.uid, seen });
    if (seen) {
      return;
    }
    unreadFromFlags += 1;
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

  if (unseenIds) {
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
    seenCount: null,
    fetched: notifications.length + parseErrors.length,
    unreadFetched: unseenIds ? uids.length : unreadFromFlags,
    notifications,
    parseErrors,
  };
}

export async function markSaasInboxMessagesSeen(
  uids: number[],
  folder = "INBOX",
  deps: EmailFetcherDeps = defaultDeps
): Promise<void> {
  const resolved = deps ?? defaultDeps;
  if (uids.length === 0) {
    return;
  }
  const credentials = await resolved.getCredentials();
  const client = await connectSaasClient(credentials, resolved.createClient);
  try {
    const lock = await client.getMailboxLock(folder);
    try {
      await markMailboxUidsSeen(client, uids);
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // logout failure should not mask a successful flag update
    }
  }
}

export async function fetchSaasInboxEmails(
  folder = "INBOX",
  limit = 20,
  deps: EmailFetcherDeps = defaultDeps
): Promise<ParsedEmailNotification[]> {
  const report = await fetchSaasInboxReport(folder, limit, deps);
  return report.notifications;
}
