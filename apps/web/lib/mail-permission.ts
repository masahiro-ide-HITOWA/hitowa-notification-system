export const HQ_WEB_MAIL_EXCLUDED_NOTE = "※本部社員はWebメール機能の対象外です";
export const FIELD_MAIL_SETTINGS_TITLE = "📧 Webメール接続設定（KAGOYA等）";

export type MypageMailSettingsView = "excluded" | "settings";

export function mypageMailSettingsView(email?: string): MypageMailSettingsView {
  return canUseWebMail(email) ? "settings" : "excluded";
}

export const WEB_MAIL_NEEDS_SETTINGS_NOTE =
  "メール接続設定が未保存です。設定画面でアカウント名とパスワードを保存してください。";

export type WebMailNavMode = "enabled" | "hq-excluded" | "needs-settings";

export function isMailAccountConfigured(username?: string, hasPassword?: boolean): boolean {
  return Boolean(username?.trim()) && hasPassword === true;
}

export function resolveWebMailNavMode(
  email: string | undefined,
  username?: string,
  hasPassword?: boolean
): WebMailNavMode {
  if (!canUseWebMail(email)) {
    return "hq-excluded";
  }
  if (!isMailAccountConfigured(username, hasPassword)) {
    return "needs-settings";
  }
  return "enabled";
}

export function canUseWebMail(email?: string): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  return domain !== "hitowa.com";
}
