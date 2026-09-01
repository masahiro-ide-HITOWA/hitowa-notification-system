import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  USER_SETTINGS_SK,
  type UserChannelSettings,
} from "../models/channelSettings";
import type { NotificationDeliveryItem } from "../models/notification";

export const TTL_SECONDS_90_DAYS = 90 * 24 * 60 * 60;

export function computeExpireAt(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000) + TTL_SECONDS_90_DAYS;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

export function parseUserChannelSettings(
  item: Record<string, unknown> | undefined,
  employeeId: string,
): UserChannelSettings | undefined {
  if (!item) {
    return undefined;
  }
  if (
    !isBoolean(item.google_chat) ||
    !isBoolean(item.line) ||
    !isBoolean(item.slack)
  ) {
    return undefined;
  }
  if (
    !isOptionalString(item.google_chat_webhook_url) ||
    !isOptionalString(item.line_user_id) ||
    !isOptionalString(item.slack_webhook_url)
  ) {
    return undefined;
  }
  return {
    employee_id: employeeId,
    google_chat: item.google_chat,
    line: item.line,
    slack: item.slack,
    google_chat_webhook_url: item.google_chat_webhook_url,
    line_user_id: item.line_user_id,
    slack_webhook_url: item.slack_webhook_url,
    mail: isOptionalString(item.mail) ? item.mail : undefined,
  };
}

export function createDocumentClient(
  client: DynamoDBClient = new DynamoDBClient({}),
): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(client);
}

export async function getUserChannelSettings(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  employeeId: string,
): Promise<UserChannelSettings | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        employee_id: employeeId,
        notification_id: USER_SETTINGS_SK,
      },
    }),
  );
  return parseUserChannelSettings(result.Item, employeeId);
}

export async function putNotificationDelivery(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  item: NotificationDeliveryItem,
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

export type SamlJitSettingsInput = {
  employeeId: string;
  googleChatEnabled: boolean;
  mail?: string;
  updatedAt: string;
};

export async function upsertUserSettingsFromSaml(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  input: SamlJitSettingsInput,
): Promise<void> {
  const names: Record<string, string> = {
    "#line": "line",
    "#slack": "slack",
    "#google_chat": "google_chat",
    "#updated_at": "updated_at",
  };
  const values: Record<string, string | boolean> = {
    ":false": false,
    ":google_chat": input.googleChatEnabled,
    ":updated_at": input.updatedAt,
  };

  let updateExpression =
    "SET #line = if_not_exists(#line, :false), #slack = if_not_exists(#slack, :false), #updated_at = :updated_at";

  if (input.googleChatEnabled) {
    updateExpression += ", #google_chat = :google_chat";
    if (input.mail) {
      names["#mail"] = "mail";
      values[":mail"] = input.mail;
      updateExpression += ", #mail = :mail";
    }
  } else {
    updateExpression += ", #google_chat = if_not_exists(#google_chat, :false)";
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        employee_id: input.employeeId,
        notification_id: USER_SETTINGS_SK,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
