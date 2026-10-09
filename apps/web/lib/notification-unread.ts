import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { isDynamoValidationError } from "@/lib/email-notification";

const NOTIFICATION_TABLE =
  process.env.DYNAMODB_NOTIFICATION_TABLE || "HitowaNotifications";

interface CountPage {
  Count?: number;
  LastEvaluatedKey?: Record<string, unknown>;
}

async function sumCount(
  loadPage: (startKey?: Record<string, unknown>) => Promise<CountPage>
): Promise<number> {
  let total = 0;
  let startKey: Record<string, unknown> | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await loadPage(startKey);
    total += result.Count ?? 0;
    if (!result.LastEvaluatedKey) {
      return total;
    }
    startKey = result.LastEvaluatedKey;
  }
  return total;
}

function unreadQuery(portalUserId: string, startKey?: Record<string, unknown>): Promise<CountPage> {
  return docClient.send(
    new QueryCommand({
      TableName: NOTIFICATION_TABLE,
      KeyConditionExpression: "portalUserId = :portalUserId",
      FilterExpression: "isRead = :unread",
      ExpressionAttributeValues: { ":portalUserId": portalUserId, ":unread": false },
      Select: "COUNT",
      ExclusiveStartKey: startKey,
    })
  );
}

function unreadScan(portalUserId: string, startKey?: Record<string, unknown>): Promise<CountPage> {
  return docClient.send(
    new ScanCommand({
      TableName: NOTIFICATION_TABLE,
      FilterExpression: "portalUserId = :portalUserId AND isRead = :unread",
      ExpressionAttributeValues: { ":portalUserId": portalUserId, ":unread": false },
      Select: "COUNT",
      ExclusiveStartKey: startKey,
    })
  );
}

export async function countUnreadForUser(portalUserId: string): Promise<number> {
  try {
    return await sumCount((startKey) => unreadQuery(portalUserId, startKey));
  } catch (error) {
    console.error("[notifications] unread count query failed", error);
    if (!isDynamoValidationError(error)) {
      throw error;
    }
    try {
      return await sumCount((startKey) => unreadScan(portalUserId, startKey));
    } catch (scanError) {
      console.error("[notifications] unread count scan failed", scanError);
      throw scanError;
    }
  }
}
