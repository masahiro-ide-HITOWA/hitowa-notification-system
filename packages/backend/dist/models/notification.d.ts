/** 通知連携元 SaaS（カオナビ / TOKIUM / クラウドハウス労務 等） */
export type SourceSystem = "kaonavi" | "tokium" | "cloudhouse_labor";
/**
 * 各種 SaaS から API 経由で受け取る共通通知ペイロード。
 * カオナビ・TOKIUM・クラウドハウス労務の各連携で同一スキーマを利用する。
 */
export interface NotificationPayload {
    /** 通知対象の従業員 ID */
    target_employee_id: string;
    /** 通知の発生元システム */
    source_system: SourceSystem;
    /** 通知タイトル */
    title: string;
    /** 通知本文 */
    body: string;
    /** 通知に紐づくアクション URL */
    action_url: string;
    /** 通知カテゴリ */
    category: string;
}
/**
 * DynamoDB に永続化する通知レコード。
 *
 * キー設計:
 * - pk: `EMP#{target_employee_id}` — 従業員単位の通知一覧取得用パーティションキー
 * - sk: `NOTIF#{created_at}#{notification_id}` — 時系列ソート用ソートキー
 */
export interface NotificationRecord extends NotificationPayload {
    /** パーティションキー（`EMP#{target_employee_id}`） */
    pk: string;
    /** ソートキー（`NOTIF#{created_at}#{notification_id}`） */
    sk: string;
    /** 通知 ID（システム内で一意） */
    notification_id: string;
    /** 受信・保存日時（ISO 8601） */
    created_at: string;
    /** 既読フラグ */
    is_read: boolean;
    /** 既読日時（ISO 8601、未読時は未設定） */
    read_at?: string;
    /** TTL（Unix epoch 秒、未設定時は無期限） */
    ttl?: number;
}
