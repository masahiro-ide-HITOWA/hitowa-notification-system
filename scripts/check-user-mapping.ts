import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";
const region = process.env.AWS_REGION || "ap-northeast-1";

export interface UserMappingReport {
  email: string;
  status: string | null;
  lineUserId: string | null;
  lastReplyStatus: number | string | null;
  lastReplyError: string | null;
  lastReplyAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readStatusOrCode(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return readString(value);
}

export function parseEmailArg(argv: string[]): string | null {
  const args = argv.filter((arg) => arg !== "--");
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--email" && typeof args[i + 1] === "string") {
      return readString(args[i + 1]);
    }
    if (arg.startsWith("--email=")) {
      return readString(arg.slice("--email=".length));
    }
  }
  return readString(args[0] ?? null);
}

export function toUserMappingReport(
  email: string,
  item: Record<string, unknown> | null
): UserMappingReport | null {
  if (!item) {
    return null;
  }
  return {
    email,
    status: readString(item.status),
    lineUserId: readString(item.lineUserId),
    lastReplyStatus: readStatusOrCode(item.lastReplyStatus),
    lastReplyError: readString(item.lastReplyError),
    lastReplyAt: readString(item.lastReplyAt),
  };
}

export function formatUserMappingReport(report: UserMappingReport): string {
  return [
    `email: ${report.email}`,
    `status: ${report.status ?? "(null)"}`,
    `lineUserId: ${report.lineUserId ?? "(null)"}`,
    `lastReplyStatus: ${report.lastReplyStatus ?? "(null)"}`,
    `lastReplyError: ${report.lastReplyError ?? "(null)"}`,
    `lastReplyAt: ${report.lastReplyAt ?? "(null)"}`,
  ].join("\n");
}

async function loadMapping(email: string): Promise<Record<string, unknown> | null> {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { email },
    })
  );
  return isRecord(result.Item) ? result.Item : null;
}

async function main(): Promise<void> {
  const email = parseEmailArg(process.argv.slice(2));
  if (!email) {
    console.error("usage: npx tsx scripts/check-user-mapping.ts <email>");
    process.exitCode = 1;
    return;
  }

  console.log(`[check-user-mapping] table=${TABLE_NAME} region=${region} email=${email}`);
  const report = toUserMappingReport(email, await loadMapping(email));
  if (!report) {
    console.error("[check-user-mapping] record not found");
    process.exitCode = 1;
    return;
  }
  console.log(formatUserMappingReport(report));
}

const invokedPath = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (invokedPath.endsWith("check-user-mapping.ts") || invokedPath.endsWith("check-user-mapping.js")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[check-user-mapping] failed", message);
    process.exitCode = 1;
  });
}
