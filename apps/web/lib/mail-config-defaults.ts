function readHost(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed !== "" ? trimmed : fallback;
}

function readPort(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** KAGOYA IMAP/SMTP. Override via MAIL_IMAP_HOST / MAIL_IMAP_PORT / MAIL_SMTP_HOST / MAIL_SMTP_PORT. */
export const MAIL_SERVER_DEFAULTS = {
  imapHost: readHost(process.env.MAIL_IMAP_HOST, "mss191.kagoya.net"),
  imapPort: readPort(process.env.MAIL_IMAP_PORT, 143),
  smtpHost: readHost(process.env.MAIL_SMTP_HOST, "mss191.kagoya.net"),
  smtpPort: readPort(process.env.MAIL_SMTP_PORT, 587),
};

export const ACCOUNT_NAME_PLACEHOLDER = "masahiro-ide@hitowa.com";
