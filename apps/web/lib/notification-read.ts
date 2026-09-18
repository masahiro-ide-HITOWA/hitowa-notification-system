import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { isDynamoTableMissing } from "@/lib/email-notification";
import type { NotificationItem } from "@/lib/notifications";

const NOTIFICATION_TABLE =
  process.env.DYNAMODB_NOTIFICATION_TABLE || "HitowaNotifications";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export interface MarkReadInput {
  id: string;
  portalUserId: string;
}

export type MarkReadResult =
  | { ok: true; id: string }
  | { ok: false; status: 400 | 404 | 500; message: string };

export function parseMarkReadRequest(
  body: unknown,
  headerUserId: string | null
): MarkReadInput | null {
  if (!isRecord(body)) {
    return null;
  }
  const id = readNonEmptyString(body.id);
  const portalUserId =
    readNonEmptyString(headerUserId) ?? readNonEmptyString(body.portalUserId);
  if (!id || !portalUserId) {
    return null;
  }
  return { id, portalUserId };
}

export function markItemsAsRead(
  items: NotificationItem[],
  id: string
): NotificationItem[] {
  return items.map((item) => (item.id === id ? { ...item, isRead: true } : item));
}

export async function markNotificationAsRead(
  id: string,
  portalUserId: string
): Promise<MarkReadResult> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: NOTIFICATION_TABLE,
        Key: { portalUserId, id },
        UpdateExpression: "SET isRead = :read",
        ConditionExpression: "attribute_exists(id) AND attribute_exists(portalUserId)",
        ExpressionAttributeValues: { ":read": true },
      })
    );
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Error) {
      console.error("[notification-read] UpdateCommand failed", error.message);
      console.error(error.stack);
    } else {
      console.error("[notification-read] UpdateCommand failed", error);
    }

    if (isDynamoTableMissing(error)) {
      return {
        ok: false,
        status: 404,
        message: `DynamoDB テーブルが存在しません: ${NOTIFICATION_TABLE}`,
      };
    }

    const name =
      isRecord(error) && typeof error.name === "string" ? error.name : "";
    if (name === "ConditionalCheckFailedException") {
      return { ok: false, status: 404, message: "対象の通知が見つかりません" };
    }

    return { ok: false, status: 500, message: "既読への更新に失敗しました" };
  }
}
