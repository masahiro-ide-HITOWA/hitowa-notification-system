import { describe, expect, it } from "vitest";

import { CONFIG_MISSING_MESSAGE } from "../apps/web/lib/mail-imap-model";
import { sendMail } from "../apps/web/lib/mail-smtp";
import {
  MISSING_TO_MESSAGE,
  classifySmtpFailure,
  extractEmailAddress,
  parseRecipientList,
  parseSendMailPayload,
  quotedForwardBody,
  readTrimmedTo,
  resolveDisplayName,
  resolveSenderFrom,
  withSubjectPrefix,
} from "../apps/web/lib/mail-smtp-model";
import type { MailConfigInput } from "../apps/web/lib/mail-config";

const sampleConfig: MailConfigInput & { portalUserId: string } = {
  portalUserId: "00400611",
  imapHost: "mss191.kagoya.net",
  imapPort: 143,
  smtpHost: "mss191.kagoya.net",
  smtpPort: 587,
  username: "field@kagoya.jp",
  password: "secret",
};

describe("mail-smtp-model", () => {
  it("parses a send payload and prefixes reply/forward subjects", () => {
    expect(
      parseSendMailPayload({
        to: "boss@example.com",
        subject: "報告",
        body: "本文です",
        mode: "reply",
      })
    ).toMatchObject({ to: "boss@example.com", mode: "reply" });
    expect(parseSendMailPayload({ to: "a@b.com", subject: "x" })).toBeNull();
    expect(withSubjectPrefix("評価シート", "Re:")).toBe("Re: 評価シート");
    expect(withSubjectPrefix("Re: 評価シート", "Re:")).toBe("Re: 評価シート");
    expect(extractEmailAddress("人事 <hr@example.com>")).toBe("hr@example.com");
    expect(resolveDisplayName("井出征希テスト", "masahiro-ide@hitowa.com")).toBe(
      "井出征希テスト"
    );
    expect(resolveDisplayName(undefined, "masahiro-ide@hitowa.com")).toBe("masahiro-ide");
    expect(resolveSenderFrom("井出征希テスト", "masahiro-ide@hitowa.com")).toEqual({
      name: "井出征希テスト",
      address: "masahiro-ide@hitowa.com",
    });
  });

  it("builds a quoted forward body", () => {
    const quoted = quotedForwardBody({
      from: "a@example.com",
      to: "b@example.com",
      date: "2026-09-18T03:00:00.000Z",
      subject: "元メール",
      text: "元の本文",
      html: "",
    });
    expect(quoted).toContain("----- 転送されたメッセージ -----");
    expect(quoted).toContain("元の本文");
  });

  it("classifies SMTP auth vs connection failures", () => {
    const auth = classifySmtpFailure(Object.assign(new Error("Invalid login"), { code: "EAUTH" }));
    expect(auth.code).toBe("AUTH_FAILED");
    const conn = classifySmtpFailure(Object.assign(new Error("connect timeout"), { code: "ETIMEDOUT" }));
    expect(conn.code).toBe("CONNECTION_FAILED");
  });
});

describe("sendMail", () => {
  it("sends through a mock SMTP transport with a named From header", async () => {
    const sent: Array<{
      from: { name: string; address: string };
      envelope?: { from: string; to: string[] };
      to: string | string[];
      subject: string;
      text: string;
    }> = [];
    const result = await sendMail(
      "00400611",
      {
        to: "boss@example.com",
        subject: "報告",
        body: "完了しました",
        mode: "new",
        fromName: "井出征希テスト",
        fromEmail: "masahiro-ide@hitowa.com",
      },
      {
        loadConfig: async () => sampleConfig,
        createTransport: () => ({
          sendMail: async (options) => {
            sent.push({
              from: options.from,
              envelope: options.envelope,
              to: options.to,
              subject: options.subject,
              text: options.text,
            });
            return { messageId: "<id@smtp>" };
          },
        }),
      }
    );
    expect(result).toEqual({
      success: true,
      message: "メールを送信しました",
      messageId: "<id@smtp>",
    });
    expect(sent[0]).toEqual({
      from: { name: "井出征希テスト", address: "masahiro-ide@hitowa.com" },
      envelope: {
        from: "masahiro-ide@hitowa.com",
        to: ["boss@example.com"],
      },
      to: ["boss@example.com"],
      subject: "報告",
      text: "完了しました",
    });
  });

  it("parses comma-separated recipients into an array", async () => {
    let toValue: string | string[] | undefined;
    await sendMail(
      "00400611",
      { to: "a@example.com, b@example.com", subject: "x", body: "y" },
      {
        loadConfig: async () => sampleConfig,
        createTransport: () => ({
          sendMail: async (options) => {
            toValue = options.to;
            return { messageId: "<id@smtp>" };
          },
        }),
      }
    );
    expect(toValue).toEqual(["a@example.com", "b@example.com"]);
  });

  it("rejects an empty to address before calling SMTP", async () => {
    expect(readTrimmedTo({ to: "   " })).toBe("");
    expect(parseRecipientList("")).toEqual([]);
    expect(parseSendMailPayload({ to: "", subject: "x", body: "y" })).toBeNull();
    await expect(
      sendMail(
        "00400611",
        { to: "  ", subject: "x", body: "y" },
        {
          loadConfig: async () => sampleConfig,
          createTransport: () => ({
            sendMail: async () => ({ messageId: "unused" }),
          }),
        }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: MISSING_TO_MESSAGE,
    });
  });

  it("throws CONFIG_MISSING when SMTP settings are not registered", async () => {
    await expect(
      sendMail(
        "00400611",
        { to: "a@b.com", subject: "x", body: "y" },
        {
          loadConfig: async () => null,
          createTransport: () => ({
            sendMail: async () => ({ messageId: "unused" }),
          }),
        }
      )
    ).rejects.toMatchObject({ code: "CONFIG_MISSING", message: CONFIG_MISSING_MESSAGE });
  });
});
