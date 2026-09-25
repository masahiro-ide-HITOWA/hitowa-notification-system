import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";

export const LINE_MAPPING_TABLE =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

export interface LineLinkStatusResponse {
  success: true;
  status: "PENDING" | "COMPLETED";
  isLinked: boolean;
  lineUserId: string | null;
}

export interface LineMappingReader {
  getByKey: (key: Record<string, string>) => Promise<Record<string, unknown> | null>;
  queryByOneTimeCode: (code: string) => Promise<Record<string, unknown> | null>;
  scanByOneTimeCode?: (code: string) => Promise<Record<string, unknown> | null>;
  scanByPortalUserId?: (portalUserId: string) => Promise<Record<string, unknown> | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function ignoreLookupError<T>(run: () => Promise<T | null>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function pendingLineStatus(): LineLinkStatusResponse {
  return {
    success: true,
    status: "PENDING",
    isLinked: false,
    lineUserId: null,
  };
}

export function statusFromMappingItem(
  item: Record<string, unknown> | null | undefined
): LineLinkStatusResponse {
  if (!item) {
    return pendingLineStatus();
  }
  const lineUserId = typeof item.lineUserId === "string" && item.lineUserId !== "" ? item.lineUserId : null;
  const mappingStatus = typeof item.status === "string" ? item.status : "";
  if (mappingStatus === "DISABLED" || mappingStatus === "UNLINKED") {
    return pendingLineStatus();
  }
  const isLinked =
    mappingStatus === "COMPLETED" ||
    (mappingStatus === "ACTIVE" && lineUserId !== null) ||
    lineUserId !== null;
  return {
    success: true,
    status: isLinked ? "COMPLETED" : "PENDING",
    isLinked,
    lineUserId: isLinked ? lineUserId : null,
  };
}

export async function findLineMapping(
  params: { code?: string | null; email?: string | null; portalUserId?: string | null },
  reader: LineMappingReader
): Promise<Record<string, unknown> | null> {
  const code = params.code?.trim() ?? "";
  const email = params.email?.trim() ?? "";
  const portalUserId = params.portalUserId?.trim() ?? "";

  if (code !== "") {
    const fromIndex = await ignoreLookupError(() => reader.queryByOneTimeCode(code));
    if (fromIndex) {
      return fromIndex;
    }
    const fromCodeKey = await ignoreLookupError(() => reader.getByKey({ oneTimeCode: code }));
    if (fromCodeKey) {
      return fromCodeKey;
    }
    const scanByOneTimeCode = reader.scanByOneTimeCode;
    if (scanByOneTimeCode) {
      const fromScan = await ignoreLookupError(() => scanByOneTimeCode(code));
      if (fromScan) {
        return fromScan;
      }
    }
  }

  if (email !== "") {
    const fromEmailKey = await ignoreLookupError(() => reader.getByKey({ email }));
    if (fromEmailKey) {
      return fromEmailKey;
    }
  }

  const scanByPortalUserId = reader.scanByPortalUserId;
  if (portalUserId !== "" && scanByPortalUserId) {
    const fromPortalUser = await ignoreLookupError(() => scanByPortalUserId(portalUserId));
    if (fromPortalUser) {
      return fromPortalUser;
    }
  }

  return null;
}

export async function findMappingByPortalUserIdOrCode(
  params: { portalUserId?: string | null; code?: string | null; email?: string | null },
  reader: LineMappingReader
): Promise<Record<string, unknown> | null> {
  return findLineMapping(params, reader);
}

async function defaultGetByKey(key: Record<string, string>): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: LINE_MAPPING_TABLE,
      Key: key,
    })
  );
  return isRecord(result.Item) ? result.Item : null;
}

async function defaultQueryByOneTimeCode(code: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: LINE_MAPPING_TABLE,
      IndexName: "oneTimeCode-index",
      KeyConditionExpression: "oneTimeCode = :code",
      ExpressionAttributeValues: { ":code": code },
    })
  );
  const first = result.Items?.[0];
  return isRecord(first) ? first : null;
}

async function defaultScanByOneTimeCode(code: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: LINE_MAPPING_TABLE,
      FilterExpression: "oneTimeCode = :code",
      ExpressionAttributeValues: { ":code": code },
    })
  );
  const first = result.Items?.[0];
  return isRecord(first) ? first : null;
}

function pickLinkedItem(items: unknown[] | undefined): Record<string, unknown> | null {
  const records = (items ?? []).filter(isRecord);
  const linked = records.find((item) => {
    if (item.status === "DISABLED" || item.status === "UNLINKED") {
      return false;
    }
    const lineUserId = typeof item.lineUserId === "string" && item.lineUserId !== "";
    return item.status === "COMPLETED" || item.status === "ACTIVE" || lineUserId;
  });
  return linked ?? null;
}

async function defaultScanByPortalUserId(portalUserId: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: LINE_MAPPING_TABLE,
      FilterExpression: "portalUserId = :puid",
      ExpressionAttributeValues: { ":puid": portalUserId },
    })
  );
  return pickLinkedItem(result.Items);
}

const defaultReader: LineMappingReader = {
  getByKey: defaultGetByKey,
  queryByOneTimeCode: defaultQueryByOneTimeCode,
  scanByOneTimeCode: defaultScanByOneTimeCode,
  scanByPortalUserId: defaultScanByPortalUserId,
};

export async function readLineLinkStatus(
  params: { code?: string | null; email?: string | null },
  reader: LineMappingReader = defaultReader
): Promise<LineLinkStatusResponse> {
  const item = await findLineMapping(params, reader);
  return statusFromMappingItem(item);
}

export const defaultLineMappingReader = defaultReader;
