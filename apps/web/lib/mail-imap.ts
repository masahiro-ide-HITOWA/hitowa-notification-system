import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { isImapSecure, type MailConfigInput } from "@/lib/mail-config";
import { getMailConfigForConnection } from "@/lib/mail-config-store";
import {
  CONFIG_MISSING_MESSAGE,
  MailImapError,
  latestSequenceRange,
  toMailDetail,
  toMailListItem,
  type MailDetail,
  type MailFetchedLike,
  type MailListItem,
} from "@/lib/mail-imap-model";

export interface MailboxLockLike {
  release(): void;
}

export interface ImapClientLike {
  connect(): Promise<void>;
  logout(): Promise<void>;
  mailbox: { exists: number } | false;
  getMailboxLock(path: string): Promise<MailboxLockLike>;
  fetch(
    range: string,
    query: { uid: boolean; envelope: boolean; flags: boolean }
  ): AsyncIterable<MailFetchedLike>;
  fetchOne(
    range: string,
    query: { source: boolean; envelope: boolean; uid: boolean },
    options: { uid: boolean }
  ): Promise<MailFetchedLike | false>;
}

export interface MailImapDeps {
  loadConfig: (portalUserId: string) => Promise<(MailConfigInput & { portalUserId: string }) | null>;
  createClient: (config: MailConfigInput) => ImapClientLike;
}

function defaultCreateClient(config: MailConfigInput): ImapClientLike {
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

const defaultDeps: MailImapDeps = {
  loadConfig: getMailConfigForConnection,
  createClient: defaultCreateClient,
};

async function withMailbox<T>(
  portalUserId: string,
  folder: string,
  run: (client: ImapClientLike) => Promise<T>,
  deps: MailImapDeps
): Promise<T> {
  const config = await deps.loadConfig(portalUserId);
  if (!config) {
    throw new MailImapError("CONFIG_MISSING", CONFIG_MISSING_MESSAGE);
  }

  const client = deps.createClient(config);
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const lock = await client.getMailboxLock(folder);
    try {
      return await run(client);
    } finally {
      lock.release();
    }
  } catch (error) {
    if (error instanceof MailImapError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "IMAP connection failed";
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

export async function fetchMailList(
  portalUserId: string,
  folder = "INBOX",
  limit = 20,
  deps: MailImapDeps = defaultDeps
): Promise<MailListItem[]> {
  return withMailbox(
    portalUserId,
    folder,
    async (client) => {
      const exists = client.mailbox === false ? 0 : client.mailbox.exists;
      const range = latestSequenceRange(exists, limit);
      if (!range) {
        return [];
      }
      const items: MailListItem[] = [];
      for await (const message of client.fetch(range, { uid: true, envelope: true, flags: true })) {
        items.push(toMailListItem(message));
      }
      return items.sort((a, b) => b.uid - a.uid);
    },
    deps
  );
}

export async function fetchMailDetail(
  portalUserId: string,
  uid: number,
  folder = "INBOX",
  deps: MailImapDeps = defaultDeps
): Promise<MailDetail> {
  if (!Number.isInteger(uid) || uid <= 0) {
    throw new MailImapError("NOT_FOUND", "メールが見つかりません");
  }

  return withMailbox(
    portalUserId,
    folder,
    async (client) => {
      const message = await client.fetchOne(String(uid), { source: true, envelope: true, uid: true }, { uid: true });
      if (!message || !message.source) {
        throw new MailImapError("NOT_FOUND", "メールが見つかりません");
      }
      const parsed = await simpleParser(message.source);
      return toMailDetail(message.uid, parsed);
    },
    deps
  );
}
