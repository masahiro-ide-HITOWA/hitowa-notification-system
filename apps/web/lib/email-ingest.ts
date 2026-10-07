import { randomUUID } from "node:crypto";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  createNotificationFromEmail,
  isDynamoTableMissing,
  isDynamoValidationError,
  listMappedPortalUserIds,
  logEmailWebhookError,
  resolvePortalUserIdFromMappings,
  shouldSkipLinePushForMappings,
} from "@/lib/email-notification";
import type { ParsedEmailNotification } from "@/lib/email-parser";
import {
  fallbackPortalUserIds,
  isSharedNotificationAddress,
  selectIngestPortalUserIds,
  sharedNotificationInbox,
} from "@/lib/email-target-user";
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

async function scanUserMappings(recipientEmail?: string): Promise<unknown[]> {
  try {
    const filtered = await docClient.send(
      new ScanCommand({
        TableName: USER_TABLE,
        ...(recipientEmail
          ? { ...USER_EMAIL_SCAN, ExpressionAttributeValues: { ":email": recipientEmail } }
          : {}),
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

async function resolveIngestPortalUserIds(
  parsed: ParsedEmailNotification
): Promise<{ ids: string[]; items: unknown[] }> {
  const recipientItems = await scanUserMappings(parsed.recipientEmail);
  const mappedRecipientId = resolvePortalUserIdFromMappings(recipientItems, parsed.recipientEmail);
  const viaShared =
    isSharedNotificationAddress(parsed.recipientEmail) ||
    isSharedNotificationAddress(parsed.sourceRecipient);
  if (mappedRecipientId || !viaShared) {
    return { ids: mappedRecipientId ? [mappedRecipientId] : [], items: recipientItems };
  }

  const envIds = fallbackPortalUserIds();
  const sharedEmail = sharedNotificationInbox();
  const sharedItems =
    parsed.recipientEmail.toLowerCase() === sharedEmail
      ? recipientItems
      : await scanUserMappings(sharedEmail);
  const sharedInboxMappedId = resolvePortalUserIdFromMappings(sharedItems, sharedEmail);
  const needsAllUsers = envIds.length === 0 && !sharedInboxMappedId;
  const allItems = needsAllUsers ? await scanUserMappings() : sharedItems;
  return {
    ids: selectIngestPortalUserIds({
      recipientEmail: parsed.recipientEmail,
      sourceRecipient: parsed.sourceRecipient,
      mappedRecipientId,
      sharedInboxMappedId,
      envFallbackIds: envIds,
      allMappedIds: listMappedPortalUserIds(allItems),
    }),
    items: allItems,
  };
}

export async function ingestParsedEmailNotification(
  parsed: ParsedEmailNotification
): Promise<EmailIngestResult> {
  let resolved: { ids: string[]; items: unknown[] };
  try {
    resolved = await resolveIngestPortalUserIds(parsed);
  } catch (error) {
    logEmailWebhookError("[email ingest] HitowaUserMappings scan failed", error);
    if (isDynamoTableMissing(error)) {
      return { ok: false, status: 404, message: `DynamoDB テーブルが存在しません: ${USER_TABLE}`, table: USER_TABLE };
    }
    throw error;
  }

  if (resolved.ids.length === 0) {
    return { ok: false, status: 404, message: "宛先メールに対応するユーザーが見つかりません" };
  }

  const createdAt = new Date().toISOString();
  let saved: { notificationId: string; portalUserId: string } | null = null;
  for (const portalUserId of resolved.ids) {
    const notificationId = randomUUID();
    const notification = createNotificationFromEmail(parsed, portalUserId, notificationId, createdAt);
    try {
      await docClient.send(new PutCommand({ TableName: NOTIFICATION_TABLE, Item: notification }));
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
    saved ??= { notificationId, portalUserId };
    try {
      if (shouldSkipLinePushForMappings(resolved.items, portalUserId)) {
        logEmailWebhookError("[email ingest] skip LINE push for inactive or disabled user", portalUserId);
      } else {
        await sendLinePushIfLinked(portalUserId, notification.systemName, notification.title, {
          actionUrl: notification.actionUrl,
        });
      }
    } catch (error) {
      logEmailWebhookError("[email ingest] LINE push failed", error);
    }
  }

  return { ok: true, notificationId: saved?.notificationId ?? "", portalUserId: saved?.portalUserId ?? resolved.ids[0] };
}
