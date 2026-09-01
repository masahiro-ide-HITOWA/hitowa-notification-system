import type { SQSEvent, SQSRecord } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { createProcessNotificationHandler } from "../../packages/backend/handlers/processNotification";
import type { UserChannelSettings } from "../../packages/backend/models/channelSettings";
import type { NotificationPayload } from "../../packages/backend/models/notification";
import { TTL_SECONDS_90_DAYS } from "../../packages/backend/services/notificationStore";

const validPayload: NotificationPayload = {
  target_employee_id: "emp-001",
  source_system: "tokium",
  title: "経費申請の承認依頼",
  body: "承認待ちの申請があります。",
  action_url: "https://example.com/tokium/1",
  category: "expense",
};

const settings: UserChannelSettings = {
  employee_id: "emp-001",
  google_chat: true,
  line: true,
  slack: false,
  google_chat_webhook_url: "https://chat.googleapis.com/webhook",
  line_user_id: "U123",
};

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

describe("createProcessNotificationHandler", () => {
  it("pushes to enabled channels in parallel and sets expire_at to 90 days", async () => {
    const pushChannels = vi.fn().mockResolvedValue([
      { channel: "google_chat", success: true },
      { channel: "line", success: true },
    ]);
    const saveDelivery = vi.fn().mockResolvedValue(undefined);
    const sentAt = new Date("2026-08-31T01:00:00.000Z");

    const handler = createProcessNotificationHandler({
      tableName: "hitowa-notifications",
      lineChannelAccessToken: "token",
      docClient: {} as never,
      getSettings: vi.fn().mockResolvedValue(settings),
      pushChannels,
      saveDelivery,
      now: () => sentAt,
      createId: () => "notif-1",
    });

    const response = await handler(sqsEvent(validPayload));

    expect(response.batchItemFailures).toEqual([]);
    expect(pushChannels).toHaveBeenCalledWith(validPayload, settings, {
      lineChannelAccessToken: "token",
    });
    expect(saveDelivery).toHaveBeenCalledWith({
      ...validPayload,
      employee_id: "emp-001",
      notification_id: "notif-1",
      status: "sent",
      sent_at: sentAt.toISOString(),
      expire_at: Math.floor(sentAt.getTime() / 1000) + TTL_SECONDS_90_DAYS,
      channel_results: [
        { channel: "google_chat", success: true },
        { channel: "line", success: true },
      ],
    });
  });

  it("skips push when user settings are missing and still writes TTL", async () => {
    const saveDelivery = vi.fn().mockResolvedValue(undefined);
    const handler = createProcessNotificationHandler({
      tableName: "hitowa-notifications",
      lineChannelAccessToken: "token",
      docClient: {} as never,
      getSettings: vi.fn().mockResolvedValue(undefined),
      pushChannels: vi.fn(),
      saveDelivery,
      now: () => new Date("2026-08-31T01:00:00.000Z"),
      createId: () => "notif-2",
    });

    const response = await handler(sqsEvent(validPayload));

    expect(response.batchItemFailures).toEqual([]);
    expect(saveDelivery.mock.calls[0][0].status).toBe("skipped");
    expect(saveDelivery.mock.calls[0][0].expire_at).toBe(
      Math.floor(new Date("2026-08-31T01:00:00.000Z").getTime() / 1000) +
        TTL_SECONDS_90_DAYS,
    );
  });

  it("returns batch failure when all enabled channels fail", async () => {
    const handler = createProcessNotificationHandler({
      tableName: "hitowa-notifications",
      lineChannelAccessToken: "token",
      docClient: {} as never,
      getSettings: vi.fn().mockResolvedValue(settings),
      pushChannels: vi.fn().mockResolvedValue([
        { channel: "google_chat", success: false, error: "timeout" },
        { channel: "line", success: false, error: "401" },
      ]),
      saveDelivery: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-08-31T01:00:00.000Z"),
      createId: () => "notif-3",
    });

    const response = await handler(sqsEvent(validPayload));

    expect(response.batchItemFailures).toEqual([{ itemIdentifier: "msg-1" }]);
  });
});
