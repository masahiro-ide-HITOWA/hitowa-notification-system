import type { PushChannel } from "./notification";

/** ユーザー設定アイテムの Sort Key（通知レコードと混在させない） */
export const USER_SETTINGS_SK = "SETTINGS";

/** DynamoDB 上のチャネル ON/OFF と送信先 */
export interface UserChannelSettings {
  employee_id: string;
  google_chat: boolean;
  line: boolean;
  slack: boolean;
  google_chat_webhook_url?: string;
  line_user_id?: string;
  slack_webhook_url?: string;
  /** SAML Assertion の mail 属性（Gmail） */
  mail?: string;
}

export function enabledChannels(
  settings: UserChannelSettings,
): PushChannel[] {
  const channels: PushChannel[] = [];
  if (settings.google_chat) {
    channels.push("google_chat");
  }
  if (settings.line) {
    channels.push("line");
  }
  if (settings.slack) {
    channels.push("slack");
  }
  return channels;
}
