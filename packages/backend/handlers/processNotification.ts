import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { randomUUID } from "crypto";

import { sendToEnabledChannels } from "../clients/pushChannels";
import type { UserChannelSettings } from "../models/channelSettings";
import type {
  NotificationDeliveryItem,
  NotificationDeliveryStatus,
} from "../models/notification";
import {
  computeExpireAt,
  createDocumentClient,
  getUserChannelSettings,
  putNotificationDelivery,
} from "../services/notificationStore";
import { validateNotificationPayload } from "../validators/notificationPayload";

export type ProcessNotificationDependencies = {
  tableName: string;
  lineChannelAccessToken: string;
  docClient: DynamoDBDocumentClient;
  getSettings?: (
    employeeId: string,
  ) => Promise<UserChannelSettings | undefined>;
  pushChannels?: typeof sendToEnabledChannels;
  saveDelivery?: (item: NotificationDeliveryItem) => Promise<void>;
  now?: () => Date;
  createId?: () => string;
};

function resolveStatus(
  enabledCount: number,
  results: NotificationDeliveryItem["channel_results"],
): NotificationDeliveryStatus {
  if (enabledCount === 0) {
    return "skipped";
  }
  const successCount = results.filter((item) => item.success).length;
  if (successCount === results.length) {
    return "sent";
  }
  if (successCount === 0) {
    return "failed";
  }
  return "partial";
}

export function createProcessNotificationHandler(
  deps: ProcessNotificationDependencies,
) {
  const getSettings =
    deps.getSettings ??
    ((employeeId: string) =>
      getUserChannelSettings(deps.docClient, deps.tableName, employeeId));
  const pushChannels = deps.pushChannels ?? sendToEnabledChannels;
  const saveDelivery =
    deps.saveDelivery ??
    ((item: NotificationDeliveryItem) =>
      putNotificationDelivery(deps.docClient, deps.tableName, item));
  const now = deps.now ?? (() => new Date());
  const createId = deps.createId ?? (() => randomUUID());

  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

    for (const record of event.Records) {
      try {
        await processRecord(record.body);
      } catch (error) {
        console.error("Failed to process notification", {
          messageId: record.messageId,
          error,
        });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };

  async function processRecord(body: string): Promise<void> {
    const parsed: unknown = JSON.parse(body);
    const validation = validateNotificationPayload(parsed);
    if (!validation.ok) {
      throw new Error(`Invalid payload: ${validation.errors.join(", ")}`);
    }

    const payload = validation.payload;
    const settings = await getSettings(payload.target_employee_id);
    const channelResults = settings
      ? await pushChannels(payload, settings, {
          lineChannelAccessToken: deps.lineChannelAccessToken,
        })
      : [];

    const enabledCount = settings
      ? Number(settings.google_chat) +
        Number(settings.line) +
        Number(settings.slack)
      : 0;
    const status = settings
      ? resolveStatus(enabledCount, channelResults)
      : "skipped";

    const sentAt = now();
    await saveDelivery({
      ...payload,
      employee_id: payload.target_employee_id,
      notification_id: createId(),
      status,
      sent_at: sentAt.toISOString(),
      expire_at: computeExpireAt(sentAt.getTime()),
      channel_results: channelResults,
    });

    if (status === "failed") {
      throw new Error("All enabled channel deliveries failed");
    }
  }
}

/** SQS トリガー送信制御 Lambda のエントリポイント */
export const handler = createProcessNotificationHandler({
  tableName: process.env.NOTIFICATIONS_TABLE_NAME ?? "",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  docClient: createDocumentClient(new DynamoDBClient({})),
});
