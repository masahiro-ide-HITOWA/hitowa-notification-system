import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  evaluateLinePushTarget,
  isLineBlockOrUnfriendError,
  shouldPersistLineBlockDisable,
} from "@/lib/line-push-guard";
import type { NotificationSystemName } from "@/lib/notifications";

export const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

const USER_TABLE =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

function textMessages(text: string): Array<Record<string, unknown>> {
  return [{ type: "text", text }];
}

export function formatInboundLinePushText(
  systemName: NotificationSystemName | string,
  title: string,
  actionUrl?: string | null
): string {
  const lines = [`【新着通知】${systemName}`, "------------------", title];
  if (actionUrl && actionUrl.trim() !== "") {
    lines.push("", actionUrl.trim(), "", "※上のリンクから対象システムを開けます。");
    return lines.join("\n");
  }
  lines.push("", "※詳細はマイ通知画面よりご確認ください。");
  return lines.join("\n");
}

export function buildLinePushMessages(
  systemName: NotificationSystemName | string,
  title: string,
  actionUrl?: string | null
): Array<Record<string, unknown>> {
  return textMessages(formatInboundLinePushText(systemName, title, actionUrl));
}

export function findLinkedLineUserId(
  items: unknown[] | undefined,
  portalUserId: string
): string | null {
  const target = evaluateLinePushTarget(items, portalUserId);
  return target.outcome === "linked" ? target.lineUserId : null;
}

export type LinePushSkipReason =
  | "not-linked"
  | "inactive"
  | "blocked"
  | "no-token"
  | "push-failed"
  | "lookup-failed";

export type LinePushResult =
  | { sent: true; lineUserId: string }
  | { sent: false; reason: LinePushSkipReason };

export interface LinePushHttpResult {
  ok: boolean;
  status: number;
  body: string;
}

export interface LinePushDependencies {
  scanMappings?: (portalUserId: string) => Promise<unknown[]>;
  pushMessage?: (
    lineUserId: string,
    text: string,
    actionUrl?: string | null
  ) => Promise<boolean | LinePushHttpResult>;
  channelAccessToken?: string | undefined;
  actionUrl?: string | null;
  disableBlockedLink?: (email: string) => Promise<void>;
}

async function defaultScanMappings(portalUserId: string): Promise<unknown[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: USER_TABLE,
      FilterExpression: "portalUserId = :puid",
      ExpressionAttributeValues: { ":puid": portalUserId },
    })
  );
  return result.Items ?? [];
}

async function defaultDisableBlockedLink(email: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: USER_TABLE,
      Key: { email },
      UpdateExpression: "SET #st = :disabled, disabledAt = :at REMOVE lineUserId",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":disabled": "DISABLED",
        ":at": new Date().toISOString(),
      },
    })
  );
}

function normalizePushResult(value: boolean | LinePushHttpResult): LinePushHttpResult {
  if (typeof value === "boolean") {
    return { ok: value, status: value ? 200 : 500, body: "" };
  }
  return value;
}

async function defaultPushMessage(
  lineUserId: string,
  text: string,
  _actionUrl?: string | null
): Promise<LinePushHttpResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, status: 0, body: "missing token" };
  }
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: textMessages(text),
    }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

export async function sendLinePushIfLinked(
  portalUserId: string,
  systemName: NotificationSystemName | string,
  title: string,
  deps?: LinePushDependencies
): Promise<LinePushResult> {
  try {
    const scanMappings = deps?.scanMappings ?? defaultScanMappings;
    const pushMessage = deps?.pushMessage ?? defaultPushMessage;
    const channelAccessToken =
      deps?.channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;

    const items = await scanMappings(portalUserId);
    const target = evaluateLinePushTarget(items, portalUserId);
    if (target.outcome === "inactive") {
      console.log("[line-push] skip inactive or disabled user", portalUserId);
      return { sent: false, reason: "inactive" };
    }
    if (target.outcome !== "linked") {
      return { sent: false, reason: "not-linked" };
    }
    if (!channelAccessToken) {
      return { sent: false, reason: "no-token" };
    }

    const actionUrl = deps?.actionUrl;
    const text = formatInboundLinePushText(systemName, title, actionUrl);
    const result = normalizePushResult(await pushMessage(target.lineUserId, text, actionUrl));
    if (result.ok) {
      return { sent: true, lineUserId: target.lineUserId };
    }
    if (isLineBlockOrUnfriendError(result.status, result.body)) {
      console.error("[line-push] LINE blocked or unfriended", result.status, result.body);
      const disableBlockedLink = deps?.disableBlockedLink ?? defaultDisableBlockedLink;
      if (target.email && shouldPersistLineBlockDisable(target.email)) {
        try {
          await disableBlockedLink(target.email);
        } catch (disableError) {
          console.error("[line-push] failed to set DISABLED after block", disableError);
        }
      } else {
        console.log("[line-push] skip DISABLED update for test/dev or unmatched user");
      }
      return { sent: false, reason: "blocked" };
    }
    return { sent: false, reason: "push-failed" };
  } catch (error) {
    if (error instanceof Error) {
      console.error("[line-push] sendLinePushIfLinked failed", error.message);
      console.error(error.stack);
    } else {
      console.error("[line-push] sendLinePushIfLinked failed", error);
    }
    return { sent: false, reason: "lookup-failed" };
  }
}
