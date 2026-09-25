import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildLinePushMessages,
  findLinkedLineUserId,
  formatInboundLinePushText,
  sendLinePushIfLinked,
} from "../apps/web/lib/line-push";

describe("findLinkedLineUserId", () => {
  it("returns lineUserId only when status is COMPLETED", () => {
    expect(
      findLinkedLineUserId(
        [
          { portalUserId: "00400611", status: "PENDING", lineUserId: "U-pending" },
          { portalUserId: "00400611", status: "COMPLETED", lineUserId: "U-linked" },
        ],
        "00400611"
      )
    ).toBe("U-linked");
  });

  it("returns null when the user is not LINE-linked", () => {
    expect(
      findLinkedLineUserId(
        [{ portalUserId: "00400611", status: "COMPLETED" }],
        "00400611"
      )
    ).toBeNull();
    expect(findLinkedLineUserId([], "00400611")).toBeNull();
  });

  it("does not treat DISABLED or isActive false as linked", () => {
    expect(
      findLinkedLineUserId(
        [{ portalUserId: "00400611", status: "COMPLETED", lineUserId: "U1", isActive: false }],
        "00400611"
      )
    ).toBeNull();
    expect(
      findLinkedLineUserId(
        [{ portalUserId: "00400611", status: "DISABLED", lineUserId: "U1" }],
        "00400611"
      )
    ).toBeNull();
  });
});

describe("sendLinePushIfLinked", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("formats the inbound LINE push message", () => {
    expect(formatInboundLinePushText("カオナビ", "評価リマインド")).toBe(
      [
        "【新着通知】カオナビ",
        "------------------",
        "評価リマインド",
        "",
        "※詳細はマイ通知画面よりご確認ください。",
      ].join("\n")
    );
  });

  it("skips push when the mapping is not COMPLETED", async () => {
    const pushMessage = vi.fn(async () => true);
    const result = await sendLinePushIfLinked("00400611", "TOKIUM", "経費承認", {
      channelAccessToken: "token",
      scanMappings: async () => [
        { portalUserId: "00400611", status: "PENDING", lineUserId: "U1" },
      ],
      pushMessage,
    });
    expect(result).toEqual({ sent: false, reason: "not-linked" });
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it("pushes when COMPLETED and lineUserId exist", async () => {
    const pushMessage = vi.fn(async () => true);
    const result = await sendLinePushIfLinked("00400611", "カオナビ", "評価リマインド", {
      channelAccessToken: "token",
      scanMappings: async () => [
        { portalUserId: "00400611", status: "COMPLETED", lineUserId: "U-linked" },
      ],
      pushMessage,
    });
    expect(result).toEqual({ sent: true, lineUserId: "U-linked" });
    expect(pushMessage).toHaveBeenCalledWith(
      "U-linked",
      formatInboundLinePushText("カオナビ", "評価リマインド"),
      undefined
    );
  });

  it("sends a single text message that includes actionUrl", () => {
    const url = "https://p.kaonavi.jp/member/evaluations/2026";
    const messages = buildLinePushMessages("カオナビ", "評価リマインド", url);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      type: "text",
      text: formatInboundLinePushText("カオナビ", "評価リマインド", url),
    });
    expect(String(messages[0]?.text)).toContain(url);
  });

  it("does not throw when lookup fails", async () => {
    const result = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => {
        throw new Error("dynamo down");
      },
      pushMessage: async () => true,
    });
    expect(result).toEqual({ sent: false, reason: "lookup-failed" });
  });

  it("skips push for inactive or DISABLED accounts", async () => {
    const pushMessage = vi.fn(async () => true);
    const inactive = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => [
        {
          portalUserId: "00400611",
          status: "COMPLETED",
          lineUserId: "U-linked",
          isActive: false,
        },
      ],
      pushMessage,
    });
    expect(inactive).toEqual({ sent: false, reason: "inactive" });
    expect(pushMessage).not.toHaveBeenCalled();

    const disabled = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => [
        { portalUserId: "00400611", status: "DISABLED", lineUserId: "U-linked" },
      ],
      pushMessage,
    });
    expect(disabled).toEqual({ sent: false, reason: "inactive" });
  });

  it("does not disable mapping on a generic LINE 400", async () => {
    const disableBlockedLink = vi.fn(async () => undefined);
    const result = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => [
        {
          portalUserId: "00400611",
          status: "COMPLETED",
          lineUserId: "U-linked",
          email: "ops@hitowa.com",
        },
      ],
      pushMessage: async () => ({
        ok: false,
        status: 400,
        body: JSON.stringify({ message: "The request body has 1 error(s)" }),
      }),
      disableBlockedLink,
    });
    expect(result).toEqual({ sent: false, reason: "push-failed" });
    expect(disableBlockedLink).not.toHaveBeenCalled();
  });

  it("does not persist DISABLED for demo users even on Not a friend", async () => {
    const disableBlockedLink = vi.fn(async () => undefined);
    const result = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => [
        {
          portalUserId: "00400611",
          status: "COMPLETED",
          lineUserId: "U-linked",
          email: "masahiro-ide@hitowa.com",
        },
      ],
      pushMessage: async () => ({
        ok: false,
        status: 400,
        body: "Not a friend",
      }),
      disableBlockedLink,
    });
    expect(result).toEqual({ sent: false, reason: "blocked" });
    expect(disableBlockedLink).not.toHaveBeenCalled();
  });

  it("disables LINE mapping only on explicit block errors in production", async () => {
    const disableBlockedLink = vi.fn(async () => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LINE_AUTO_DISABLE_ON_BLOCK", "true");
    const result = await sendLinePushIfLinked("00400611", "カオナビ", "評価", {
      channelAccessToken: "token",
      scanMappings: async () => [
        {
          portalUserId: "00400611",
          status: "COMPLETED",
          lineUserId: "U-linked",
          email: "ops@hitowa.com",
        },
      ],
      pushMessage: async () => ({
        ok: false,
        status: 400,
        body: JSON.stringify({ message: "You can't send messages because they have blocked you." }),
      }),
      disableBlockedLink,
    });
    expect(result).toEqual({ sent: false, reason: "blocked" });
    expect(disableBlockedLink).toHaveBeenCalledWith("ops@hitowa.com");
    vi.unstubAllEnvs();
  });
});
