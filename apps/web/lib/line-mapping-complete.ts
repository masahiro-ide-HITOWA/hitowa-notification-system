import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  LINE_MAPPING_TABLE,
  defaultLineMappingReader,
  findLineMapping,
  type LineMappingReader,
} from "@/lib/line-mapping-lookup";

export type PrepareLineLinkResult =
  | { ok: true; key: Record<string, string> }
  | { ok: false; reason: "not_found" | "expired" | "update_failed" };

export type CompleteLineLinkResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "update_failed" };

export interface LineMappingWriter {
  updateLink: (key: Record<string, string>, lineUserId: string, linkedAt: string) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mappingUpdateKey(item: Record<string, unknown>): Record<string, string> | null {
  const email = typeof item.email === "string" ? item.email.trim() : "";
  if (email !== "") {
    return { email };
  }
  const oneTimeCode = typeof item.oneTimeCode === "string" ? item.oneTimeCode.trim() : "";
  if (oneTimeCode !== "") {
    return { oneTimeCode };
  }
  return null;
}

export function isExpiredMapping(item: Record<string, unknown>, nowMs: number = Date.now()): boolean {
  const expiresAt = typeof item.expiresAt === "string" ? Date.parse(item.expiresAt) : Number.NaN;
  return !Number.isNaN(expiresAt) && expiresAt < nowMs;
}

async function defaultUpdateLink(
  key: Record<string, string>,
  lineUserId: string,
  linkedAt: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: LINE_MAPPING_TABLE,
      Key: key,
      UpdateExpression:
        "SET #st = :completed, lineUserId = :uid, linkedAt = :linkedAt REMOVE #ttl",
      ExpressionAttributeNames: { "#st": "status", "#ttl": "ttl" },
      ExpressionAttributeValues: {
        ":completed": "COMPLETED",
        ":uid": lineUserId,
        ":linkedAt": linkedAt,
      },
    })
  );
}

const defaultWriter: LineMappingWriter = { updateLink: defaultUpdateLink };

export async function persistCompletedLink(
  key: Record<string, string>,
  lineUserId: string,
  writer: LineMappingWriter = defaultWriter
): Promise<void> {
  await writer.updateLink(key, lineUserId, new Date().toISOString());
}

export async function persistLineReplyDebug(
  key: Record<string, string>,
  status: number,
  errorMessage: string | null
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: LINE_MAPPING_TABLE,
      Key: key,
      UpdateExpression:
        "SET lastReplyStatus = :status, lastReplyError = :error, lastReplyAt = :at",
      ExpressionAttributeValues: {
        ":status": status,
        ":error": errorMessage ?? "",
        ":at": new Date().toISOString(),
      },
    })
  );
}

export async function prepareLineLinkByCode(
  code: string,
  reader: LineMappingReader = defaultLineMappingReader
): Promise<PrepareLineLinkResult> {
  const item = await findLineMapping({ code }, reader);
  const found = Boolean(item && isRecord(item));
  console.log("[line-webhook] dynamodbFound", found, {
    status: found && item && typeof item.status === "string" ? item.status : null,
    hasEmail: found && item && typeof item.email === "string" && item.email.trim() !== "",
  });
  if (!item || !isRecord(item)) {
    return { ok: false, reason: "not_found" };
  }
  if (isExpiredMapping(item)) {
    return { ok: false, reason: "expired" };
  }
  const key = mappingUpdateKey(item);
  if (!key) {
    return { ok: false, reason: "update_failed" };
  }
  return { ok: true, key };
}

export async function completeLineLinkByCode(
  code: string,
  lineUserId: string,
  reader: LineMappingReader = defaultLineMappingReader,
  writer: LineMappingWriter = defaultWriter
): Promise<CompleteLineLinkResult> {
  const prepared = await prepareLineLinkByCode(code, reader);
  if (!prepared.ok) {
    return prepared;
  }
  try {
    await writer.updateLink(prepared.key, lineUserId, new Date().toISOString());
    return { ok: true };
  } catch {
    return { ok: false, reason: "update_failed" };
  }
}
