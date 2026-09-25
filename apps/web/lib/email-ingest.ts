import { randomUUID } from "node:crypto";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  createNotificationFromEmail,
  isDynamoTableMissing,
  isDynamoValidationError,
  logEmailWebhookError,
  resolvePortalUserIdFromMappings,
  shouldSkipLinePushForMappings,
} from "@/lib/email-notification";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";
import type { ParsedEmailNotification } from "@/lib/email-parser";
import { sendLinePushIfLinked } from "@/lib/line-push";

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

export type EmailIngestResult =
  | { ok: true; notificationId: string; portalUserId: string }
  | { ok: false; status: number; message: string; table?: string };

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
      logEmailWebhookError("[email ingest] email FilterExpression failed; scanning without filter", error);
      const fallback = await docClient.send(new ScanCommand({ TableName: USER_TABLE }));
      return fallback.Items ?? [];
    }
    throw error;
  }
}

export async function ingestParsedEmailNotification(
  parsed: ParsedEmailNotification
): Promise<EmailIngestResult> {
  let mappingItems: unknown[];
  try {
    mappingItems = await scanUserMappings(parsed.recipientEmail);
  } catch (error) {
    logEmailWebhookError("[email ingest] HitowaUserMappings scan failed", error);
    if (isDynamoTableMissing(error)) {
      return { ok: false, status: 404, message: `DynamoDB テーブルが存在しません: ${USER_TABLE}`, table: USER_TABLE };
    }
    throw error;
  }

  const portalUserId =
    resolvePortalUserIdFromMappings(mappingItems, parsed.recipientEmail) ??
    (parsed.recipientEmail.toLowerCase() === DEMO_USER_PROFILE.email.toLowerCase()
      ? DEMO_USER_PROFILE.portalUserId
      : null);
  if (!portalUserId) {
    return { ok: false, status: 404, message: "宛先メールに対応するユーザーが見つかりません" };
  }

  const notificationId = randomUUID();
  const notification = createNotificationFromEmail(
    parsed,
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
    logEmailWebhookError("[email ingest] HitowaNotifications put failed", error);
    if (isDynamoTableMissing(error)) {
      return {
        ok: false,
        status: 404,
        message: `DynamoDB テーブルが存在しません: ${NOTIFICATION_TABLE}`,
        table: NOTIFICATION_TABLE,
      };
    }
    throw error;
  }

  try {
    if (shouldSkipLinePushForMappings(mappingItems, portalUserId)) {
      logEmailWebhookError("[email ingest] skip LINE push for inactive or disabled user", portalUserId);
    } else {
      await sendLinePushIfLinked(portalUserId, notification.systemName, notification.title, {
        actionUrl: notification.actionUrl,
      });
    }
  } catch (error) {
    logEmailWebhookError("[email ingest] LINE push failed", error);
  }

  return { ok: true, notificationId, portalUserId };
}
