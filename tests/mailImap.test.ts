import { describe, expect, it } from "vitest";

import {
  CONFIG_MISSING_MESSAGE,
  latestSequenceRange,
  normalizeMailFolder,
  parseMailLimit,
  toMailDetail,
  toMailListItem,
} from "../apps/web/lib/mail-imap-model";
import { fetchMailDetail, fetchMailList, type ImapClientLike } from "../apps/web/lib/mail-imap";
import type { MailConfigInput } from "../apps/web/lib/mail-config";

const sampleConfig: MailConfigInput & { portalUserId: string } = {
  portalUserId: "00400611",
  imapHost: "imap.kagoya.net",
  imapPort: 993,
  smtpHost: "smtp.kagoya.net",
  smtpPort: 465,
  username: "field@kagoya.jp",
  password: "secret",
};

function mockClient(messages: Parameters<typeof toMailListItem>[0][], sourceByUid: Map<number, Buffer>): ImapClientLike {
  return {
    connect: async () => undefined,
    logout: async () => undefined,
    mailbox: { exists: messages.length },
    getMailboxLock: async () => ({ release: () => undefined }),
    fetch: async function* () {
      for (const message of messages) {
        yield message;
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

describe("mail-imap-model", () => {
  it("builds the latest sequence range and folder/limit defaults", () => {
    expect(latestSequenceRange(100, 20)).toBe("81:100");
    expect(latestSequenceRange(0, 20)).toBeNull();
    expect(normalizeMailFolder("../etc")).toBe("INBOX");
    expect(parseMailLimit("3")).toBe(3);
    expect(parseMailLimit("999")).toBe(50);
  });

  it("maps IMAP flags and envelope to list items", () => {
    const unread = toMailListItem({
      uid: 12,
      flags: new Set(),
      envelope: {
        subject: "評価シート",
        date: "2026-09-18T03:00:00.000Z",
        from: [{ name: "人事", address: "hr@example.com" }],
      },
    });
    expect(unread.isRead).toBe(false);
    expect(unread.from).toBe("人事 <hr@example.com>");

    const read = toMailListItem({ uid: 13, flags: ["\\Seen"], envelope: { subject: "既読" } });
    expect(read.isRead).toBe(true);
  });

  it("maps parsed mail into a detail view", () => {
    const detail = toMailDetail(9, {
      subject: "本文確認",
      date: new Date("2026-09-18T03:00:00.000Z"),
      html: "<p>hello</p>",
      text: "hello",
      from: { text: "a@example.com" },
      to: { text: "b@example.com" },
    });
    expect(detail).toMatchObject({
      uid: 9,
      html: "<p>hello</p>",
      from: "a@example.com",
      to: "b@example.com",
    });
  });
});

describe("fetchMailList / fetchMailDetail", () => {
  it("returns newest-first list items from a mock IMAP session", async () => {
    const client = mockClient(
      [
        { uid: 1, flags: ["\\Seen"], envelope: { subject: "old" } },
        { uid: 2, flags: [], envelope: { subject: "new" } },
      ],
      new Map()
    );
    const list = await fetchMailList("00400611", "INBOX", 20, {
      loadConfig: async () => sampleConfig,
      createClient: () => client,
    });
    expect(list.map((item) => item.uid)).toEqual([2, 1]);
    expect(list[0]?.isRead).toBe(false);
  });

  it("throws CONFIG_MISSING when IMAP settings are not registered", async () => {
    await expect(
      fetchMailList("00400611", "INBOX", 20, {
        loadConfig: async () => null,
        createClient: () => mockClient([], new Map()),
      })
    ).rejects.toEqual(expect.objectContaining({
      code: "CONFIG_MISSING",
      message: CONFIG_MISSING_MESSAGE,
    }));
  });

  it("parses RFC822 source into a mail detail", async () => {
    const raw = Buffer.from(
      "From: a@example.com\r\nTo: b@example.com\r\nSubject: parsed\r\nDate: Fri, 18 Sep 2026 12:00:00 +0900\r\n\r\nplain body"
    );
    const client = mockClient([], new Map([[41, raw]]));
    const detail = await fetchMailDetail("00400611", 41, "INBOX", {
      loadConfig: async () => sampleConfig,
      createClient: () => client,
    });
    expect(detail.subject).toBe("parsed");
    expect(detail.text).toContain("plain body");
  });
});
