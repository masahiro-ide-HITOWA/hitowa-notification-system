export const LINE_MULTICAST_LIMIT = 500;
export const LINE_MULTICAST_URL = "https://api.line.me/v2/bot/message/multicast";

export type AnnouncementTargetType = "ALL" | "OFFICE";

export interface AnnouncementRequest {
  title: string;
  content: string;
  targetType: AnnouncementTargetType;
  officeCode?: string;
}

export type ParseAnnouncementResult =
  | { ok: true; request: AnnouncementRequest }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function parseAnnouncementRequest(body: unknown): ParseAnnouncementResult {
  if (!isRecord(body)) {
    return { ok: false, message: "リクエストボディが不正です" };
  }

  const title = readNonEmptyString(body.title);
  const content = readNonEmptyString(body.content);
  if (!title || !content) {
    return { ok: false, message: "title と content は必須です" };
  }

  const targetType = body.targetType;
  if (targetType !== "ALL" && targetType !== "OFFICE") {
    return { ok: false, message: "targetType は ALL または OFFICE である必要があります" };
  }

  if (targetType === "OFFICE") {
    const officeCode = readNonEmptyString(body.officeCode);
    if (!officeCode) {
      return { ok: false, message: "OFFICE 配信では officeCode が必須です" };
    }
    return { ok: true, request: { title, content, targetType, officeCode } };
  }

  return { ok: true, request: { title, content, targetType: "ALL" } };
}

export function formatAnnouncementMessage(title: string, content: string): string {
  return `【お知らせ】${title}\n------------------\n${content}`;
}

export function chunkLineUserIds(
  ids: string[],
  size: number = LINE_MULTICAST_LIMIT
): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

function itemOfficeCode(item: Record<string, unknown>): string | null {
  if (isRecord(item.attributes)) {
    return readNonEmptyString(item.attributes.officeCode);
  }
  return readNonEmptyString(item.officeCode);
}

export function extractAnnouncementRecipients(
  items: unknown[] | undefined,
  targetType: AnnouncementTargetType,
  officeCode?: string
): string[] {
  if (!items) {
    return [];
  }

  const ids = items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    if (item.status !== "COMPLETED") {
      return [];
    }
    const lineUserId = readNonEmptyString(item.lineUserId);
    if (!lineUserId) {
      return [];
    }
    if (targetType === "OFFICE" && itemOfficeCode(item) !== officeCode) {
      return [];
    }
    return [lineUserId];
  });

  return [...new Set(ids)];
}

export type MulticastSender = (to: string[], text: string) => Promise<boolean>;

export async function sendAnnouncementMulticast(
  lineUserIds: string[],
  text: string,
  sendChunk: MulticastSender
): Promise<number> {
  let successCount = 0;
  for (const chunk of chunkLineUserIds(lineUserIds)) {
    const ok = await sendChunk(chunk, text);
    if (ok) {
      successCount += chunk.length;
    }
  }
  return successCount;
}

export function createLineMulticastSender(
  channelAccessToken: string,
  fetchImpl: typeof fetch
): MulticastSender {
  return async (to, text) => {
    const response = await fetchImpl(LINE_MULTICAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + channelAccessToken,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });
    return response.ok;
  };
}

export function buildAnnouncementScanFilter(request: AnnouncementRequest): {
  FilterExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, string>;
} {
  const ExpressionAttributeNames = { "#st": "status" };
  const ExpressionAttributeValues: Record<string, string> = { ":status": "COMPLETED" };
  let FilterExpression = "#st = :status AND attribute_exists(lineUserId)";

  if (request.targetType === "OFFICE" && request.officeCode) {
    FilterExpression += " AND attributes.officeCode = :officeCode";
    ExpressionAttributeValues[":officeCode"] = request.officeCode;
  }

  return { FilterExpression, ExpressionAttributeNames, ExpressionAttributeValues };
}
