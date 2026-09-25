import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseEmailNotification, parsedMailToEmailPayload, type ParsedEmailNotification } from "@/lib/email-parser";
import { isImapSecure } from "@/lib/mail-config";
import { type ImapClientLike } from "@/lib/mail-imap";
import { latestSequenceRange, MailImapError, type MailFetchedLike } from "@/lib/mail-imap-model";
import {
  getMailCredentials,
  toMailConfigInput,
  type MailCredentials,
} from "@/lib/secrets";

export interface EmailFetcherDeps {
  getCredentials: () => Promise<MailCredentials>;
  createClient: (credentials: MailCredentials) => ImapClientLike;
}

function defaultCreateClient(credentials: MailCredentials): ImapClientLike {
  const config = toMailConfigInput(credentials);
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: isImapSecure(config.imapPort),
    connectionTimeout: 30000,
    auth: { user: config.username, pass: config.password },
    logger: false,
  });
  return client as unknown as ImapClientLike;
}

const defaultDeps: EmailFetcherDeps = {
  getCredentials: () => getMailCredentials(),
  createClient: defaultCreateClient,
};

async function parseFetchedSource(
  message: MailFetchedLike
): Promise<ParsedEmailNotification | null> {
  if (!message.source) {
    return null;
  }
  try {
    const parsed = await simpleParser(message.source);
    const result = parseEmailNotification(parsedMailToEmailPayload(parsed));
    if (!result.ok) {
      console.error("[email-fetcher] skip unparsable mail", {
        uid: message.uid,
        message: result.message,
      });
      return null;
    }
    return result.notification;
  } catch (error) {
    console.error("[email-fetcher] mail parse failed", { uid: message.uid, error });
    return null;
  }
}

export async function fetchSaasInboxEmails(
  folder = "INBOX",
  limit = 20,
  deps: EmailFetcherDeps = defaultDeps
): Promise<ParsedEmailNotification[]> {
  let credentials: MailCredentials;
  try {
    credentials = await deps.getCredentials();
  } catch (error) {
    console.error("[email-fetcher] credentials unavailable", error);
    throw new MailImapError(
      "CONFIG_MISSING",
      "メール受信用の資格情報を取得できません"
    );
  }

  const client = deps.createClient(credentials);
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const lock = await client.getMailboxLock(folder);
    try {
      const exists = client.mailbox === false ? 0 : client.mailbox.exists;
      const range = latestSequenceRange(exists, limit);
      if (!range) {
        return [];
      }
      const notifications: ParsedEmailNotification[] = [];
      for await (const message of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
      })) {
        if (!message.source) {
          const full = await client.fetchOne(
            String(message.uid),
            { source: true, envelope: true, uid: true },
            { uid: true }
          );
          if (!full) {
            continue;
          }
          const notification = await parseFetchedSource(full);
          if (notification) {
            notifications.push(notification);
          }
          continue;
        }
        const notification = await parseFetchedSource(message);
        if (notification) {
          notifications.push(notification);
        }
      }
      return notifications;
    } finally {
      lock.release();
    }
  } catch (error) {
    if (error instanceof MailImapError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "IMAP connection failed";
    console.error("[email-fetcher] IMAP connection failed", {
      host: credentials.host,
      port: credentials.port,
      email: credentials.email,
      error,
    });
    throw new MailImapError("CONNECTION_FAILED", `IMAP接続に失敗しました: ${message}`);
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
