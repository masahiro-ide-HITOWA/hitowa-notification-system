import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  isDynamoTableMissing,
  isDynamoValidationError,
} from "@/lib/email-notification";
import {
  getNotificationsForUser,
  notificationsFromDynamoItems,
  type NotificationItem,
} from "@/lib/notifications";

const NOTIFICATION_TABLE =
  process.env.DYNAMODB_NOTIFICATION_TABLE || "HitowaNotifications";

async function queryByPortalUserId(portalUserId: string): Promise<unknown[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: NOTIFICATION_TABLE,
      KeyConditionExpression: "portalUserId = :portalUserId",
      ExpressionAttributeValues: { ":portalUserId": portalUserId },
      ScanIndexForward: false,
    })
  );
  return result.Items ?? [];
}

async function scanByPortalUserId(portalUserId: string): Promise<unknown[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: NOTIFICATION_TABLE,
      FilterExpression: "portalUserId = :portalUserId",
      ExpressionAttributeValues: { ":portalUserId": portalUserId },
    })
  );
  return result.Items ?? [];
}

export async function loadNotificationsForUser(
  portalUserId: string
): Promise<NotificationItem[]> {
  try {
    const items = await queryByPortalUserId(portalUserId);
    return notificationsFromDynamoItems(items);
  } catch (error) {
    console.error("[notifications] QueryCommand failed", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }

    if (isDynamoValidationError(error)) {
      try {
        const scanned = await scanByPortalUserId(portalUserId);
        return notificationsFromDynamoItems(scanned);
      } catch (scanError) {
        console.error("[notifications] ScanCommand fallback failed", scanError);
        if (scanError instanceof Error) {
          console.error(scanError.stack);
        }
        if (isDynamoTableMissing(scanError)) {
          return getNotificationsForUser(portalUserId);
        }
        return getNotificationsForUser(portalUserId);
      }
    }

    if (isDynamoTableMissing(error)) {
      return getNotificationsForUser(portalUserId);
    }

    return getNotificationsForUser(portalUserId);
  }
}
