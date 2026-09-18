import { NextResponse } from "next/server";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { docClient } from "@/lib/dynamodb";
import { parseEmailNotification } from "@/lib/email-parser";
import {
  createNotificationFromEmail,
  isDynamoTableMissing,
  isDynamoValidationError,
  logEmailWebhookError,
  resolvePortalUserIdFromMappings,
} from "@/lib/email-notification";

const USER_TABLE =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";
const NOTIFICATION_TABLE =
  process.env.DYNAMODB_NOTIFICATION_TABLE || "HitowaNotifications";

const USER_EMAIL_SCAN = {
  FilterExpression: "#attr.#email = :email",
  ExpressionAttributeNames: {
    "#attr": "attributes",
    "#email": "email",
  },
} as const;

async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch (error) {
    logEmailWebhookError("[email webhook] JSON parse failed", error);
    return null;
  }
}

async function scanUserMappings(recipientEmail: string): Promise<unknown[]> {
  try {
    const filtered = await docClient.send(
      new ScanCommand({
        TableName: USER_TABLE,
        ...USER_EMAIL_SCAN,
        ExpressionAttributeValues: { ":email": recipientEmail },
      })
    );
    return filtered.Items ?? [];
  } catch (error) {
    if (isDynamoTableMissing(error)) {
      throw error;
    }
    if (isDynamoValidationError(error)) {
      logEmailWebhookError("[email webhook] email FilterExpression failed; scanning without filter", error);
      const fallback = await docClient.send(new ScanCommand({ TableName: USER_TABLE }));
      return fallback.Items ?? [];
    }
    throw error;
  }
}

function tableMissingResponse(tableName: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message: `DynamoDB テーブルが存在しません: ${tableName}`,
      table: tableName,
    },
    { status: 404 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body === null) {
      return NextResponse.json(
        { success: false, message: "JSON ペイロードを解析できません" },
        { status: 400 }
      );
    }

    const parsed = parseEmailNotification(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    let mappingItems: unknown[];
    try {
      mappingItems = await scanUserMappings(parsed.notification.recipientEmail);
    } catch (error) {
      logEmailWebhookError("[email webhook] HitowaUserMappings scan failed", error);
      if (isDynamoTableMissing(error)) {
        return tableMissingResponse(USER_TABLE);
      }
      throw error;
    }

    const portalUserId = resolvePortalUserIdFromMappings(
      mappingItems,
      parsed.notification.recipientEmail
    );
    if (!portalUserId) {
      return NextResponse.json(
        { success: false, message: "宛先メールに対応するユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const notificationId = randomUUID();
    const notification = createNotificationFromEmail(
      parsed.notification,
      portalUserId,
      notificationId,
      new Date().toISOString()
    );

    try {
      await docClient.send(
        new PutCommand({
          TableName: NOTIFICATION_TABLE,
          Item: notification,
        })
      );
    } catch (error) {
      logEmailWebhookError("[email webhook] HitowaNotifications put failed", error);
      if (isDynamoTableMissing(error)) {
        return tableMissingResponse(NOTIFICATION_TABLE);
      }
      throw error;
    }

    return NextResponse.json({ success: true, notificationId });
  } catch (error) {
    logEmailWebhookError("[email webhook] unhandled error", error);
    return NextResponse.json(
      { success: false, message: "メール通知の取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
