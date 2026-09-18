import { NextResponse } from "next/server";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { docClient } from "@/lib/dynamodb";
import { parseEmailNotification } from "@/lib/email-parser";
import {
  createNotificationFromEmail,
  resolvePortalUserIdFromMappings,
} from "@/lib/email-notification";

const USER_TABLE =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";
const NOTIFICATION_TABLE =
  process.env.DYNAMODB_NOTIFICATION_TABLE || "HitowaNotifications";

export async function POST(request: Request) {
  try {
    const parsed = parseEmailNotification(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: USER_TABLE,
        FilterExpression: "attributes.email = :email",
        ExpressionAttributeValues: { ":email": parsed.notification.recipientEmail },
      })
    );

    const portalUserId = resolvePortalUserIdFromMappings(
      scanResult.Items,
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

    await docClient.send(
      new PutCommand({
        TableName: NOTIFICATION_TABLE,
        Item: notification,
      })
    );

    return NextResponse.json({ success: true, notificationId });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { success: false, message: "メール通知の取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
