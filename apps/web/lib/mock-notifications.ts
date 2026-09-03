import type {
  NotificationCategory,
  PortalNotification,
  SourceSystem,
} from "./notification-types";

export const SOURCE_LABEL: Record<SourceSystem, string> = {
  kaonavi: "カオナビ",
  tokium: "TOKIUM",
  cloudhouse_labor: "クラウドハウス労務",
};

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  attendance: "勤怠",
  expense: "経費",
  hr: "労務",
  evaluation: "評価",
};

export const MOCK_NOTIFICATIONS: PortalNotification[] = [
  {
    id: "n-1",
    source_system: "kaonavi",
    title: "目標設定シートの提出期限が近づいています",
    body: "上期の目標設定シートが未提出です。カオナビから提出してください。",
    action_url: "https://example.kaonavi.jp/sheets/1",
    category: "evaluation",
    is_read: false,
    created_at: "2026-08-31T01:20:00.000Z",
  },
  {
    id: "n-2",
    source_system: "tokium",
    title: "経費申請の承認依頼があります",
    body: "交通費の申請が承認待ちです。内容を確認して承認または差戻しを行ってください。",
    action_url: "https://example.tokium.jp/approvals/88",
    category: "expense",
    is_read: false,
    created_at: "2026-08-30T08:10:00.000Z",
  },
  {
    id: "n-3",
    source_system: "cloudhouse_labor",
    title: "年末調整の書類提出をお願いします",
    body: "扶養控除等申告書の提出期限は今週金曜です。未提出の場合は催促が送られます。",
    action_url: "https://example.cloud-house.jp/nencho/2026",
    category: "hr",
    is_read: false,
    created_at: "2026-08-29T05:00:00.000Z",
  },
  {
    id: "n-4",
    source_system: "kaonavi",
    title: "勤怠の打刻漏れがあります",
    body: "8/28 の出勤打刻が確認できません。修正申請を行ってください。",
    action_url: "https://example.kaonavi.jp/attendance/28",
    category: "attendance",
    is_read: true,
    created_at: "2026-08-28T10:00:00.000Z",
  },
  {
    id: "n-5",
    source_system: "tokium",
    title: "領収書の添付漏れです",
    body: "交際費申請に領収書が添付されていません。差し戻し理由を確認してください。",
    action_url: "https://example.tokium.jp/receipts/12",
    category: "expense",
    is_read: true,
    created_at: "2026-08-27T03:30:00.000Z",
  },
];
