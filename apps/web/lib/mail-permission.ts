export const HQ_WEB_MAIL_EXCLUDED_NOTE = "※本部社員はWebメール機能の対象外です";
export const FIELD_MAIL_SETTINGS_TITLE = "📧 Webメール接続設定（KAGOYA等）";

export type MypageMailSettingsView = "excluded" | "settings";

export function mypageMailSettingsView(email?: string): MypageMailSettingsView {
  return canUseWebMail(email) ? "settings" : "excluded";
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
