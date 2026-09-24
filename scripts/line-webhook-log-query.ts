export const LINE_WEBHOOK_LOG_TAG = "[line-webhook]";
export const RECENT_LOG_WINDOW_MS = 10 * 60 * 1000;

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

export function lineWebhookFilterPattern(): string {
  return `"${LINE_WEBHOOK_LOG_TAG}"`;
}

export function selectTargetLogGroups(groups: LogGroupSummary[], nowMs: number): LogGroupSummary[] {
  const recent = groups
    .filter((group) => isRecentlyActive(group.lastEventTime, nowMs))
    .sort((a, b) => (b.lastEventTime ?? 0) - (a.lastEventTime ?? 0));
  if (recent.length > 0) {
    return recent;
  }
  return groups.filter((group) => /amplify/i.test(group.logGroupName)).slice(0, 30);
}

export function formatLogEvent(event: LineWebhookLogEvent): string {
  const time =
    typeof event.timestamp === "number" ? new Date(event.timestamp).toISOString() : "(no-time)";
  return `[${time}] ${event.logGroupName}\n${event.message}`;
}
