import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
  type LogGroup,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  formatLogEvent,
  lineWebhookFilterPattern,
  RECENT_LOG_WINDOW_MS,
  selectTargetLogGroups,
  SSR_LOG_GROUP_PREFIXES,
  type LineWebhookLogEvent,
  type LogGroupSummary,
} from "./line-webhook-log-query";

const region = process.env.AWS_REGION || "ap-northeast-1";

function toSummary(group: LogGroup): LogGroupSummary | null {
  const logGroupName = group.logGroupName;
  if (!logGroupName) {
    return null;
  }
  return { logGroupName, lastEventTime: group.lastEventTime };
}

async function listLogGroupsByPrefix(
  client: CloudWatchLogsClient,
  logGroupNamePrefix?: string
): Promise<LogGroupSummary[]> {
  const groups: LogGroupSummary[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.send(
      new DescribeLogGroupsCommand({
        logGroupNamePrefix,
        nextToken,
        limit: 50,
      })
    );
    for (const group of page.logGroups ?? []) {
      const summary = toSummary(group);
      if (summary) {
        groups.push(summary);
      }
    }
    nextToken = page.nextToken;
  } while (nextToken);
  return groups;
}

async function listLogGroups(client: CloudWatchLogsClient): Promise<LogGroupSummary[]> {
  const pages = await Promise.all([
    listLogGroupsByPrefix(client),
    ...SSR_LOG_GROUP_PREFIXES.map((prefix) => listLogGroupsByPrefix(client, prefix)),
  ]);
  const byName = new Map<string, LogGroupSummary>();
  for (const group of pages.flat()) {
    byName.set(group.logGroupName, group);
  }
  return [...byName.values()];
}

async function readTaggedEvents(
  client: CloudWatchLogsClient,
  logGroupName: string,
  startTime: number
): Promise<LineWebhookLogEvent[]> {
  const events: LineWebhookLogEvent[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.send(
      new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: lineWebhookFilterPattern(),
        nextToken,
      })
    );
    for (const event of page.events ?? []) {
      if (typeof event.message === "string" && event.message.includes("[line-webhook]")) {
        events.push({
          logGroupName,
          timestamp: event.timestamp,
          message: event.message.trim(),
        });
      }
    }
    nextToken = page.nextToken;
  } while (nextToken);
  return events;
}

export async function fetchLatestLineWebhookLogs(
  client: CloudWatchLogsClient = new CloudWatchLogsClient({ region })
): Promise<LineWebhookLogEvent[]> {
  const nowMs = Date.now();
  const startTime = nowMs - RECENT_LOG_WINDOW_MS;
  const groups = selectTargetLogGroups(await listLogGroups(client), nowMs);
  if (groups.length === 0) {
    console.error("[get-latest-logs] no recently updated or SSR compute log groups found");
    return [];
  }

  const batches = await Promise.all(
    groups.map((group) => readTaggedEvents(client, group.logGroupName, startTime))
  );
  return batches.flat().sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

async function main(): Promise<void> {
  console.log(`[get-latest-logs] region=${region} window=60m tag=[line-webhook]`);
  const events = await fetchLatestLineWebhookLogs();
  if (events.length === 0) {
    console.log("[get-latest-logs] no matching events");
    return;
  }
  for (const event of events) {
    console.log(formatLogEvent(event));
    console.log("----");
  }
}

const invokedPath = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (invokedPath.endsWith("get-latest-logs.ts") || invokedPath.endsWith("get-latest-logs.js")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[get-latest-logs] failed", message);
    process.exitCode = 1;
  });
}
