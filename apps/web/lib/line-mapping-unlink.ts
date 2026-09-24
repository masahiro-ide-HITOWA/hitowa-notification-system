import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  LINE_MAPPING_TABLE,
  defaultLineMappingReader,
  findMappingByPortalUserIdOrCode,
  type LineMappingReader,
} from "@/lib/line-mapping-lookup";

export type UnlinkLineResult =
  | { ok: true; email: string }
  | { ok: false; reason: "not_found" | "missing_email" | "update_failed" };

export interface LineUnlinkWriter {
  markUnlinked: (email: string, unlinkedAt: string) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mappingEmailKey(item: Record<string, unknown>): string | null {
  const email = typeof item.email === "string" ? item.email.trim() : "";
  return email !== "" ? email : null;
}

function isLinkedMapping(item: Record<string, unknown>): boolean {
  const lineUserId = typeof item.lineUserId === "string" && item.lineUserId !== "";
  return item.status === "COMPLETED" || lineUserId;
}

async function defaultMarkUnlinked(email: string, unlinkedAt: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: LINE_MAPPING_TABLE,
      Key: { email },
      UpdateExpression: "SET #st = :unlinked, unlinkedAt = :unlinkedAt REMOVE lineUserId",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":unlinked": "UNLINKED",
        ":unlinkedAt": unlinkedAt,
      },
    })
  );
}

const defaultWriter: LineUnlinkWriter = { markUnlinked: defaultMarkUnlinked };

export async function unlinkLineMapping(
  params: { email?: string | null; code?: string | null; portalUserId?: string | null },
  reader: LineMappingReader = defaultLineMappingReader,
  writer: LineUnlinkWriter = defaultWriter
): Promise<UnlinkLineResult> {
  const item = await findMappingByPortalUserIdOrCode(params, reader);
  if (!item || !isRecord(item) || !isLinkedMapping(item)) {
    return { ok: false, reason: "not_found" };
  }
  const email = mappingEmailKey(item);
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }
  try {
    await writer.markUnlinked(email, new Date().toISOString());
    return { ok: true, email };
  } catch {
    return { ok: false, reason: "update_failed" };
  }
}
