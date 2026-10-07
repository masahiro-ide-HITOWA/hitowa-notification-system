export const KAGOYA_MAIL_HOST = "mss191.kagoya.net";
export const KAGOYA_IMAP_PORT = 143;
export const KAGOYA_SMTP_PORT = 587;
export const KAGOYA_ACCOUNT_PREFIX = "kir088959.";

/** KAGOYA webmail endpoints. Host and ports are fixed. */
export const MAIL_SERVER_DEFAULTS = {
  imapHost: KAGOYA_MAIL_HOST,
  imapPort: KAGOYA_IMAP_PORT,
  smtpHost: KAGOYA_MAIL_HOST,
  smtpPort: KAGOYA_SMTP_PORT,
};

export const ACCOUNT_NAME_PLACEHOLDER = "masahiro-ide@hitowa.com";

/** `masahiro-ide@gr.hitowa.com` → `kir088959.masahiro-ide` */
export function kagoyaAccountId(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) {
    return null;
  }
  const local = trimmed.slice(0, at).trim();
  if (local === "") {
    return null;
  }
  return `${KAGOYA_ACCOUNT_PREFIX}${local}`;
}
