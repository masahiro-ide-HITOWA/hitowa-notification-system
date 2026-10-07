export const IMAP_IMPLICIT_TLS_PORT = 993;
export const IMAP_STARTTLS_PORT = 143;

export type ImapTlsMode = "ssl" | "starttls";

const TRANSPORT_FAILURE_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ETIMEOUT",
  "CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

export function imapTlsMode(port: number): ImapTlsMode {
  return port === IMAP_IMPLICIT_TLS_PORT ? "ssl" : "starttls";
}

export function imapRequireTls(port: number): boolean {
  return port !== IMAP_IMPLICIT_TLS_PORT;
}

export function startTlsFallbackPort(port: number): number | null {
  return port === IMAP_IMPLICIT_TLS_PORT ? IMAP_STARTTLS_PORT : null;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" && code !== "" ? code : undefined;
}

export function isImapTransportFailure(error: unknown): boolean {
  const code = errorCode(error);
  if (code && TRANSPORT_FAILURE_CODES.has(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /ETIMEDOUT|CONNECT_TIMEOUT|ECONNREFUSED|ENOTFOUND|timeout/i.test(message);
}

export async function withImapPortFallback<T>(
  port: number,
  connect: (port: number) => Promise<T>
): Promise<T> {
  try {
    return await connect(port);
  } catch (error) {
    const fallback = startTlsFallbackPort(port);
    if (fallback === null || !isImapTransportFailure(error)) {
      throw error;
    }
    return await connect(fallback);
  }
}
