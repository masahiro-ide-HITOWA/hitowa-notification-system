import { describe, expect, it } from "vitest";

import { fetchSaasInboxEmails } from "../apps/web/lib/email-fetcher";
import { parsedMailToEmailPayload } from "../apps/web/lib/email-parser";
import { MailImapError, type MailFetchedLike } from "../apps/web/lib/mail-imap-model";
import type { ImapClientLike } from "../apps/web/lib/mail-imap";
import type { MailCredentials } from "../apps/web/lib/secrets";

const credentials: MailCredentials = {
  email: "saas@hitowa.com",
  password: "secret",
  host: "imap.example.com",
  port: 993,
};

function mockClient(sourceByUid: Map<number, Buffer>): ImapClientLike {
  const uids = [...sourceByUid.keys()];
  return {
    connect: async () => undefined,
    logout: async () => undefined,
    mailbox: { exists: uids.length },
    getMailboxLock: async () => ({ release: () => undefined }),
    fetch: async function* (): AsyncGenerator<MailFetchedLike> {
      for (const uid of uids) {
        yield { uid, envelope: { subject: "list" } };
      }
    },
    fetchOne: async (range) => {
      const uid = Number(range);
      const source = sourceByUid.get(uid);
      if (!source) {
        return false;
      }
      return { uid, source, envelope: { subject: "detail" } };
    },
  };
}

describe("fetchSaasInboxEmails", () => {
  it("connects with Secrets Manager credentials and parses IMAP mail", async () => {
    const raw = Buffer.from(
      "From: noreply@kaonavi.jp\r\nTo: mei-sei@hitowa.com\r\nSubject: 【カオナビ】評価シート\r\n\r\n提出してください"
    );
    const notifications = await fetchSaasInboxEmails("INBOX", 20, {
      getCredentials: async () => credentials,
      createClient: () => mockClient(new Map([[1, raw]])),
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.systemName).toBe("カオナビ");
    expect(notifications[0]?.recipientEmail).toBe("mei-sei@hitowa.com");
  });

  it("logs and throws CONNECTION_FAILED when IMAP connect fails", async () => {
    await expect(
      fetchSaasInboxEmails("INBOX", 20, {
        getCredentials: async () => credentials,
        createClient: () => ({
          connect: async () => {
            throw new Error("ECONNREFUSED");
          },
          logout: async () => undefined,
          mailbox: false,
          getMailboxLock: async () => ({ release: () => undefined }),
          fetch: async function* () {
            yield { uid: 1 };
          },
          fetchOne: async () => false,
        }),
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "CONNECTION_FAILED",
      })
    );
  });

  it("throws CONFIG_MISSING when credentials cannot be loaded", async () => {
    await expect(
      fetchSaasInboxEmails("INBOX", 20, {
        getCredentials: async () => {
          throw new Error("missing");
        },
        createClient: () => mockClient(new Map()),
      })
    ).rejects.toBeInstanceOf(MailImapError);
  });
});

describe("parsedMailToEmailPayload", () => {
  it("flattens mailparser output for parseEmailNotification", () => {
    expect(
      parsedMailToEmailPayload({
        from: { text: "noreply@kaonavi.jp" },
        to: { text: "mei-sei@hitowa.com" },
        subject: "評価",
        text: "本文",
        html: false,
      })
    ).toEqual({
      from: "noreply@kaonavi.jp",
      to: "mei-sei@hitowa.com",
      subject: "評価",
      body: "本文",
    });
  });
});
