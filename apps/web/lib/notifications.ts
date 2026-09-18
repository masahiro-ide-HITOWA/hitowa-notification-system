export type NotificationSystemName =
  | "カオナビ"
  | "TOKIUM"
  | "クラウドハウス労務"
  | "全社ポータル";

export interface NotificationItem {
  id: string;
  portalUserId: string;
  systemName: NotificationSystemName;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "ntf-kaonavi-eval",
    portalUserId: "00400611",
    systemName: "カオナビ",
    title: "2026年度上期 評価シート提出リマインド",
    body: "評価シートの提出期限が近づいています。期日までにカオナビから提出してください。",
    isRead: false,
    createdAt: "2026-09-17T09:00:00+09:00",
  },
  {
    id: "ntf-tokium-expense",
    portalUserId: "00400611",
    systemName: "TOKIUM",
    title: "経費申請の承認依頼",
    body: "所属メンバーから経費申請が届いています。TOKIUMで内容を確認し、承認または差し戻しを行ってください。",
    isRead: false,
    createdAt: "2026-09-16T14:30:00+09:00",
  },
  {
    id: "ntf-cloudhouse-labor",
    portalUserId: "00400611",
    systemName: "クラウドハウス労務",
    title: "年末調整書類の提出依頼",
    body: "年末調整に必要な書類が未提出です。クラウドハウス労務から必要書類を提出してください。",
    isRead: true,
    createdAt: "2026-09-12T11:15:00+09:00",
  },
  {
    id: "ntf-portal-all",
    portalUserId: "00400611",
    systemName: "全社ポータル",
    title: "システムメンテナンスのお知らせ",
    body: "9月20日 22:00〜24:00 にポータルの定期メンテナンスを実施します。",
    isRead: true,
    createdAt: "2026-09-10T08:00:00+09:00",
  },
  {
    id: "ntf-other-user",
    portalUserId: "99999999",
    systemName: "カオナビ",
    title: "他ユーザー向けの通知",
    body: "この通知は別ユーザー宛てのため、00400611 の一覧には出ません。",
    isRead: false,
    createdAt: "2026-09-17T10:00:00+09:00",
  },
];

export function getMockNotifications(): NotificationItem[] {
  return MOCK_NOTIFICATIONS.map((item) => ({ ...item }));
}

export function getNotificationsForUser(portalUserId: string): NotificationItem[] {
  return getMockNotifications()
    .filter((item) => item.portalUserId === portalUserId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function parseNotificationsPortalUserId(
  headerUserId: string | null,
  queryUserId: string | null
): string | null {
  const header = headerUserId?.trim() ?? "";
  if (header !== "") {
    return header;
  }
  const query = queryUserId?.trim() ?? "";
  return query !== "" ? query : null;
}

export function countUnreadNotifications(items: NotificationItem[]): number {
  return items.filter((item) => !item.isRead).length;
}

function isNotificationSystemName(value: unknown): value is NotificationSystemName {
  return (
    value === "カオナビ" ||
    value === "TOKIUM" ||
    value === "クラウドハウス労務" ||
    value === "全社ポータル"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.portalUserId === "string" &&
    isNotificationSystemName(value.systemName) &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.isRead === "boolean" &&
    typeof value.createdAt === "string"
  );
}

export function parseNotificationList(value: unknown): NotificationItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items: NotificationItem[] = [];
  for (const entry of value) {
    if (!isNotificationItem(entry)) {
      return null;
    }
    items.push(entry);
  }
  return items;
}

export function sortNotificationsByCreatedAtDesc(
  items: NotificationItem[]
): NotificationItem[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    }
    return bTime - aTime;
  });
}

export function notificationsFromDynamoItems(
  items: unknown[] | undefined
): NotificationItem[] {
  if (!items) {
    return [];
  }
  return sortNotificationsByCreatedAtDesc(items.filter(isNotificationItem));
}
