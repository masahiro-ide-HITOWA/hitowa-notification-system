export const NOTIFICATION_TTL_UNREAD_SECONDS = 90 * 24 * 60 * 60;
export const NOTIFICATION_TTL_READ_SECONDS = 30 * 24 * 60 * 60;

export function notificationExpiresAt(nowMs: number, ttlSeconds: number): number {
  return Math.floor(nowMs / 1000) + ttlSeconds;
}

export function unreadNotificationExpiresAt(nowMs: number = Date.now()): number {
  return notificationExpiresAt(nowMs, NOTIFICATION_TTL_UNREAD_SECONDS);
}

export function readNotificationExpiresAt(nowMs: number = Date.now()): number {
  return notificationExpiresAt(nowMs, NOTIFICATION_TTL_READ_SECONDS);
}
