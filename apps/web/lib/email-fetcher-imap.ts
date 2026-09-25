import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseEmailNotification, parsedMailToEmailPayload, addressLikeToText, type ParsedEmailNotification } from "@/lib/email-parser";
import { isImapSecure } from "@/lib/mail-config";
import { type ImapClientLike } from "@/lib/mail-imap";
import { type MailFetchedLike } from "@/lib/mail-imap-model";
import { toMailConfigInput, type MailCredentials } from "@/lib/secrets";

export function createSaasImapClient(credentials: MailCredentials): ImapClientLike {
  const config = toMailConfigInput(credentials);
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: isImapSecure(config.imapPort),
    connectionTimeout: 30000,
    auth: { user: config.username, pass: config.password },
    logger: false,
  });
  const base = client as unknown as ImapClientLike;
  return {
    connect: () => base.connect(),
    logout: () => base.logout(),
    get mailbox() {
      return base.mailbox;
    },
    getMailboxLock: (path) => base.getMailboxLock(path),
    fetch: (range, query) => base.fetch(range, query),
    fetchOne: (range, query, options) => base.fetchOne(range, query, options),
    search: async (query) => {
      const search = (
        client as unknown as {
          search: (q: object, o?: { uid: boolean }) => Promise<number[] | false>;
        }
      ).search;
      const result = await search.call(client, query, { uid: true });
      return Array.isArray(result) ? result : [];
    },
  };
}

export function isSeenFlag(flags: MailFetchedLike["flags"]): boolean {
  if (!flags) {
    return false;
  }
  if (flags instanceof Set) {
    return flags.has("\\Seen") || flags.has("Seen");
  }
  return flags.some((flag) => flag === "\\Seen" || flag.toLowerCase() === "seen");
}

export async function searchMailboxUids(
  client: ImapClientLike,
  query: { seen?: boolean; all?: boolean }
): Promise<number[] | null> {
  if (!client.search) {
    return null;
  }
  try {
    return await client.search(query);
  } catch (error) {
    console.error("[email-fetcher] IMAP search failed; continuing with mailbox range", query, error);
    return null;
  }
}

export async function parseFetchedSource(
  message: MailFetchedLike
): Promise<{ ok: true; notification: ParsedEmailNotification } | { ok: false; message: string }> {
  if (!message.source) {
    return { ok: false, message: "RFC822 source missing" };
  }
  try {
    const parsed = await simpleParser(message.source);
    const result = parseEmailNotification(
      parsedMailToEmailPayload({
        from: { text: addressLikeToText(parsed.from) },
        to: { text: addressLikeToText(parsed.to) },
        subject: parsed.subject,
        text: typeof parsed.text === "string" ? parsed.text : false,
        html: typeof parsed.html === "string" ? parsed.html : false,
      })
    );
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, notification: result.notification };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "parse failed";
    return { ok: false, message: messageText };
  }
}

export async function loadFetchedMessage(
  client: ImapClientLike,
  message: MailFetchedLike
): Promise<MailFetchedLike | null> {
  if (message.source) {
    return message;
  }
  const full = await client.fetchOne(
    String(message.uid),
    { source: true, envelope: true, uid: true },
    { uid: true }
  );
  return full || null;
}
