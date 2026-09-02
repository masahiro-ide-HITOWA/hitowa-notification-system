import type { SQSEvent, SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { sendToEnabledChannels } from "../packages/backend/clients/pushChannels";
import { createProcessNotificationHandler } from "../packages/backend/handlers/processNotification";
import {
  enabledChannels,
  type UserChannelSettings,
} from "../packages/backend/models/channelSettings";
import type { NotificationPayload } from "../packages/backend/models/notification";
import { isGmailAddress } from "../packages/backend/models/saml";

const payload: NotificationPayload = {
  target_employee_id: "emp-001",
  source_system: "cloudhouse_labor",
  title: "年末調整の提出依頼",
  body: "提出期限が近づいています。",
  action_url: "https://example.com/labor/1",
  category: "hr",
};

function settingsFromSaml(mail: string | undefined): UserChannelSettings {
  const googleChat = isGmailAddress(mail);
  return {
    employee_id: "emp-001",
    google_chat: googleChat,
    line: false,
    slack: false,
    mail,
    google_chat_webhook_url: googleChat
      ? "https://chat.googleapis.com/v1/spaces/AAA/messages"
      : undefined,
  };
}

function sqsEvent(body: unknown): SQSEvent {
  const record: SQSRecord = {
    messageId: "msg-1",
    receiptHandle: "rh",
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "0",
      SenderId: "sender",
      ApproximateFirstReceiveTimestamp: "0",
    },
    messageAttributes: {},
    md5OfBody: "",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:ap-northeast-1:123:queue",
    awsRegion: "ap-northeast-1",
  };
  return { Records: [record] };
}

describe("SAML attribute delivery branching", () => {
  it("enables only google_chat when SAML mail is a Gmail address", () => {
    const settings = settingsFromSaml("user@gmail.com");
    expect(settings.google_chat).toBe(true);
    expect(enabledChannels(settings)).toEqual(["google_chat"]);
  });

  it("does not enable google_chat when SAML mail is missing or not Gmail", () => {
    expect(enabledChannels(settingsFromSaml(undefined))).toEqual([]);
    expect(enabledChannels(settingsFromSaml("user@hitowa.co.jp"))).toEqual([]);
  });

  it("pushes Google Chat only when SAML mail turns google_chat ON", async () => {
    const httpPost = vi.fn().mockResolvedValue({ ok: true, status: 200, text: "ok" });
    const settings = settingsFromSaml("user@gmail.com");

    const results = await sendToEnabledChannels(payload, settings, {
      lineChannelAccessToken: "token",
      httpPost,
    });

    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(httpPost.mock.calls[0][0]).toBe(settings.google_chat_webhook_url);
    expect(results).toEqual([{ channel: "google_chat", success: true }]);
  });

  it("does not call Google Chat or LINE when SAML mail is absent", async () => {
    const httpPost = vi.fn();
    const results = await sendToEnabledChannels(
      payload,
      settingsFromSaml(undefined),
      { lineChannelAccessToken: "token", httpPost },
    );

    expect(httpPost).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it("sends LINE when LINE is ON even if SAML mail did not enable google_chat", async () => {
    const httpPost = vi.fn().mockResolvedValue({ ok: true, status: 200, text: "ok" });
    const settings: UserChannelSettings = {
      ...settingsFromSaml("user@example.com"),
      line: true,
      line_user_id: "Uline",
    };

    const results = await sendToEnabledChannels(payload, settings, {
      lineChannelAccessToken: "token",
      httpPost,
    });

    expect(enabledChannels(settings)).toEqual(["line"]);
    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(httpPost.mock.calls[0][0]).toBe(
      "https://api.line.me/v2/bot/message/push",
    );
    expect(results).toEqual([{ channel: "line", success: true }]);
  });
});

describe("processNotification handler uses SAML-derived settings", () => {
  it("skips delivery when SAML did not enable any channel", async () => {
    const pushChannels = vi.fn().mockResolvedValue([]);
    const saveDelivery = vi.fn().mockResolvedValue(undefined);
    const handler = createProcessNotificationHandler({
      tableName: "hitowa-notifications",
      lineChannelAccessToken: "token",
      docClient: {} as never,
      getSettings: vi.fn().mockResolvedValue(settingsFromSaml(undefined)),
      pushChannels,
      saveDelivery,
      now: () => new Date("2026-08-31T01:00:00.000Z"),
      createId: () => "notif-saml-1",
    });

    const response = await handler(sqsEvent(payload));

    expect(response.batchItemFailures).toEqual([]);
    expect(pushChannels).toHaveBeenCalled();
    expect(saveDelivery.mock.calls[0][0].status).toBe("skipped");
  });

  it("delivers via google_chat when SAML mail provisioned the channel", async () => {
    const settings = settingsFromSaml("user@gmail.com");
    const pushChannels = vi.fn().mockResolvedValue([
      { channel: "google_chat", success: true },
    ]);
    const saveDelivery = vi.fn().mockResolvedValue(undefined);
    const handler = createProcessNotificationHandler({
      tableName: "hitowa-notifications",
      lineChannelAccessToken: "token",
      docClient: {} as never,
      getSettings: vi.fn().mockResolvedValue(settings),
      pushChannels,
      saveDelivery,
      now: () => new Date("2026-08-31T01:00:00.000Z"),
      createId: () => "notif-saml-2",
    });

    await handler(sqsEvent(payload));

    expect(pushChannels).toHaveBeenCalledWith(payload, settings, {
      lineChannelAccessToken: "token",
    });
    expect(saveDelivery.mock.calls[0][0].status).toBe("sent");
  });
});
