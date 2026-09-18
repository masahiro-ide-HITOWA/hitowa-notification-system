import { describe, expect, it, vi } from "vitest";

import {
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
});

describe("sendLinePushIfLinked", () => {
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
      formatInboundLinePushText("カオナビ", "評価リマインド")
    );
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
});
