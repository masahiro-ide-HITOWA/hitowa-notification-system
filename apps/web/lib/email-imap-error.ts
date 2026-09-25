function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function maskImapSecrets(text: string, password?: string): string {
  let masked = text;
  const secret = password?.trim() ?? "";
  if (secret !== "") {
    masked = masked.split(secret).join("********");
  }
  return masked.replace(/(pass(?:word)?["'\s:=]+)([^\s"',}\\]+)/gi, "$1********");
}

function readErrorField(error: Record<string, unknown>, key: string): string | null {
  const value = error[key];
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

const IMAP_ERROR_FIELDS = [
  "code",
  "errno",
  "command",
  "executedCommand",
  "response",
  "responseStatus",
  "responseText",
  "serverResponseCode",
  "authenticationFailed",
] as const;

export function describeImapConnectionError(
  error: unknown,
  context: { host: string; port: number; user: string; password?: string }
): string {
  const parts = [`host=${context.host}`, `port=${context.port}`, `user=${context.user}`];
  if (error instanceof Error) {
    parts.push(`name=${error.name}`);
    parts.push(`message=${maskImapSecrets(error.message, context.password)}`);
  } else {
    parts.push(`message=${maskImapSecrets(String(error), context.password)}`);
  }
  if (isRecord(error)) {
    for (const key of IMAP_ERROR_FIELDS) {
      const value = readErrorField(error, key);
      if (value) {
        parts.push(`${key}=${maskImapSecrets(value, context.password)}`);
      }
    }
    if (error.cause !== undefined) {
      const causeMessage =
        error.cause instanceof Error ? error.cause.message : String(error.cause);
      parts.push(`cause=${maskImapSecrets(causeMessage, context.password)}`);
    }
  }
  return parts.join("; ");
}
