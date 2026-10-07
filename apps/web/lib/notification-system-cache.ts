import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  BUILTIN_NOTIFICATION_SYSTEM_RULES,
  parseNotificationSystemRules,
  type NotificationSystemRule,
} from "@/lib/notification-system-rule";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function notificationSystemTableName(env: NodeJS.ProcessEnv = process.env): string {
  return env.DYNAMODB_NOTIFICATION_SYSTEM_TABLE?.trim() || "HitowaNotificationSystems";
}

export function notificationSystemCacheTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.NOTIFICATION_SYSTEM_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

type RuleCache = { rules: NotificationSystemRule[]; expiresAt: number };

let cache: RuleCache | null = null;

export function clearNotificationSystemRuleCache(): void {
  cache = null;
}

async function loadRulesFromDynamo(): Promise<NotificationSystemRule[]> {
  const scanned = await docClient.send(
    new ScanCommand({ TableName: notificationSystemTableName() })
  );
  return parseNotificationSystemRules(scanned.Items ?? []);
}

export async function loadNotificationSystemRules(
  nowMs: number = Date.now(),
  load: () => Promise<NotificationSystemRule[]> = loadRulesFromDynamo
): Promise<NotificationSystemRule[]> {
  if (cache && nowMs < cache.expiresAt) {
    return cache.rules;
  }
  let rules = BUILTIN_NOTIFICATION_SYSTEM_RULES;
  try {
    const loaded = await load();
    if (loaded.length > 0) {
      rules = loaded;
    }
  } catch (error) {
    console.error("[notification-system] failed to load rules; using built-in", error);
  }
  cache = { rules, expiresAt: nowMs + notificationSystemCacheTtlMs() };
  return rules;
}
