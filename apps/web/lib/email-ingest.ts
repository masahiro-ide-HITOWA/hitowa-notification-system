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
import { loadNotificationSystemRules } from "@/lib/notification-system-cache";
import { matchNotificationSystem, type NotificationSystemRule } from "@/lib/notification-system-rule";
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
  | { ok: false; status: number; message: string; table?: string; skipped?: boolean; duplicate?: boolean };

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
  parsed: ParsedEmailNotification,
  rules?: NotificationSystemRule[]
): Promise<EmailIngestResult> {
  const activeRules = rules ?? (await loadNotificationSystemRules());
  const matched = matchNotificationSystem(activeRules, parsed);
  if (!matched) {
    return { ok: false, status: 200, skipped: true, message: "対象システムに一致しないためスキップしました" };
  }
  const target = { ...parsed, systemName: matched.systemName };
  let resolved: { ids: string[]; items: unknown[] };
  try {
    resolved = await resolveIngestPortalUserIds(target);
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
  let duplicates = 0;
  for (const portalUserId of resolved.ids) {
    const notificationId = randomUUID();
    const notification = createNotificationFromEmail(target, portalUserId, notificationId, createdAt);
    try {
      if (await hasStoredEmail(portalUserId, target)) {
        duplicates += 1;
        continue;
      }
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

  if (!saved && duplicates === resolved.ids.length) {
    return { ok: false, status: 200, skipped: true, duplicate: true, message: "取り込み済みのメールのためスキップしました" };
  }

  return { ok: true, notificationId: saved?.notificationId ?? "", portalUserId: saved?.portalUserId ?? resolved.ids[0] };
}

async function hasStoredEmail(portalUserId: string, parsed: ParsedEmailNotification): Promise<boolean> {
  const messageId = parsed.messageId?.trim() ?? "";
  const imapUid = parsed.imapUid;
  if (messageId === "" && typeof imapUid !== "number") {
    return false;
  }
  const identity: string[] = [];
  const values: Record<string, string | number> = { ":user": portalUserId };
  if (messageId !== "") {
    identity.push("sourceMessageId = :messageId");
    values[":messageId"] = messageId;
  }
  if (typeof imapUid === "number") {
    identity.push("imapUid = :imapUid");
    values[":imapUid"] = imapUid;
  }
  const scanned = await docClient.send(
    new ScanCommand({
      TableName: NOTIFICATION_TABLE,
      FilterExpression: `portalUserId = :user AND (${identity.join(" OR ")})`,
      ExpressionAttributeValues: values,
      ProjectionExpression: "id",
    })
  );
  return (scanned.Items?.length ?? 0) > 0;
}
