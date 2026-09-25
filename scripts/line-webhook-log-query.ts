export const LINE_WEBHOOK_LOG_TAG = "[line-webhook]";
export const RECENT_LOG_WINDOW_MS = 60 * 60 * 1000;

export const SSR_LOG_GROUP_PREFIXES = ["/aws/lambda/", "/aws/spitfire/", "/aws/amplify/"] as const;

export interface LogGroupSummary {
  logGroupName: string;
  lastEventTime?: number;
}

export interface LineWebhookLogEvent {
  logGroupName: string;
  timestamp?: number;
  message: string;
}

export function isRecentlyActive(lastEventTime: number | undefined, nowMs: number): boolean {
  return typeof lastEventTime === "number" && nowMs - lastEventTime <= RECENT_LOG_WINDOW_MS;
}

export function isSsrComputeLogGroup(logGroupName: string): boolean {
  const name = logGroupName.toLowerCase();
  return (
    name.includes("amplify") ||
    name.includes("spitfire") ||
    name.includes("hitowa") ||
    name.startsWith("/aws/lambda/") ||
    name.startsWith("/aws/spitfire/") ||
    name.startsWith("/aws/amplify/")
  );
}

export function lineWebhookFilterPattern(): string {
  return `"${LINE_WEBHOOK_LOG_TAG}"`;
}

export function selectTargetLogGroups(groups: LogGroupSummary[], nowMs: number): LogGroupSummary[] {
  const selected = new Map<string, LogGroupSummary>();
  for (const group of groups) {
    if (isRecentlyActive(group.lastEventTime, nowMs) || isSsrComputeLogGroup(group.logGroupName)) {
      selected.set(group.logGroupName, group);
    }
  }
  return [...selected.values()]
    .sort((a, b) => (b.lastEventTime ?? 0) - (a.lastEventTime ?? 0))
    .slice(0, 50);
}

export function formatLogEvent(event: LineWebhookLogEvent): string {
  const time =
    typeof event.timestamp === "number" ? new Date(event.timestamp).toISOString() : "(no-time)";
  return `[${time}] ${event.logGroupName}\n${event.message}`;
}
