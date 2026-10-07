export const IMAP_IMPLICIT_TLS_PORT = 993;

export type ImapTlsMode = "ssl" | "starttls";

export function imapTlsMode(port: number): ImapTlsMode {
  return port === IMAP_IMPLICIT_TLS_PORT ? "ssl" : "starttls";
}

export function imapRequireTls(port: number): boolean {
  return port !== IMAP_IMPLICIT_TLS_PORT;
}
