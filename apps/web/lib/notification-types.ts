export type SourceSystem = "kaonavi" | "tokium" | "cloudhouse_labor";

export type NotificationCategory =
  | "attendance"
  | "expense"
  | "hr"
  | "evaluation";

export type ReadFilter = "unread" | "all";

export interface PortalNotification {
  id: string;
  source_system: SourceSystem;
  title: string;
  body: string;
  action_url: string;
  category: NotificationCategory;
  is_read: boolean;
  created_at: string;
}
