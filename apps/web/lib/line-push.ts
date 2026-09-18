import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import type { NotificationSystemName } from "@/lib/notifications";

export const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

const USER_TABLE =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function formatInboundLinePushText(
  systemName: NotificationSystemName | string,
  title: string
): string {
  return [
    `【新着通知】${systemName}`,
    "------------------",
    title,
    "",
    "※詳細はマイ通知画面よりご確認ください。",
  ].join("\n");
}

export function findLinkedLineUserId(
  items: unknown[] | undefined,
  portalUserId: string
): string | null {
  if (!items) {
    return null;
  }
  const match = items.find((item) => {
    if (!isRecord(item)) {
      return false;
    }
    const mappedId =
      readNonEmptyString(item.portalUserId) ?? readNonEmptyString(item.employeeId);
    return mappedId === portalUserId && item.status === "COMPLETED";
  });
  if (!isRecord(match)) {
    return null;
  }
  return readNonEmptyString(match.lineUserId);
}

export type LinePushSkipReason = "not-linked" | "no-token" | "push-failed" | "lookup-failed";

export type LinePushResult =
  | { sent: true; lineUserId: string }
  | { sent: false; reason: LinePushSkipReason };

export interface LinePushDependencies {
  scanMappings: (portalUserId: string) => Promise<unknown[]>;
  pushMessage: (lineUserId: string, text: string) => Promise<boolean>;
  channelAccessToken: string | undefined;
}

async function defaultScanMappings(portalUserId: string): Promise<unknown[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: USER_TABLE,
      FilterExpression: "portalUserId = :puid AND #st = :status",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":puid": portalUserId,
        ":status": "COMPLETED",
      },
    })
  );
  return result.Items ?? [];
}

async function defaultPushMessage(lineUserId: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return false;
  }
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });
  return response.ok;
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
    const lineUserId = findLinkedLineUserId(items, portalUserId);
    if (!lineUserId) {
      return { sent: false, reason: "not-linked" };
    }
    if (!channelAccessToken) {
      return { sent: false, reason: "no-token" };
    }

    const text = formatInboundLinePushText(systemName, title);
    const ok = await pushMessage(lineUserId, text);
    if (!ok) {
      return { sent: false, reason: "push-failed" };
    }
    return { sent: true, lineUserId };
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
