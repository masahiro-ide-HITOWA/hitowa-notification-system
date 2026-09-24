export const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export interface LineReplyResult {
  ok: boolean;
  status: number;
  errorMessage: string | null;
  skipped: boolean;
}

export function lineReplyAuthorizationHeader(token: string): string {
  return `Bearer ${token.trim()}`;
}

export function formatLineReplyError(status: number, body: string): string {
  const trimmed = body.replace(/\s+/g, " ").trim();
  const clipped = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
  return clipped === "" ? `LINE Reply API failed with status ${status}` : `status=${status} body=${clipped}`;
}

export function lineReplyResponseHeaders(result: LineReplyResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Line-Reply-Status": String(result.status),
    "X-Line-Reply-Ok": result.ok ? "true" : "false",
  };
  if (result.errorMessage) {
    headers["X-Line-Reply-Error"] = result.errorMessage.slice(0, 200);
  }
  return headers;
}

export async function replyLineText(replyToken: string, text: string): Promise<LineReplyResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ?? "";
  console.log("[line-webhook] LINE_CHANNEL_ACCESS_TOKEN", {
    hasAccessToken: token !== "",
    tokenLength: token.length,
  });
  if (token === "") {
    const errorMessage = "LINE_CHANNEL_ACCESS_TOKEN is missing; skip Reply API";
    console.error("[line-webhook]", errorMessage);
    return { ok: false, status: 0, errorMessage, skipped: true };
  }

  try {
    const replyRes = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: lineReplyAuthorizationHeader(token),
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
    const responseBody = await replyRes.text();
    if (!replyRes.ok) {
      const errorMessage = formatLineReplyError(replyRes.status, responseBody);
      console.error("[line-webhook] replyRes.status", replyRes.status, "errorMessage", errorMessage);
      return { ok: false, status: replyRes.status, errorMessage, skipped: false };
    }
    console.log("[line-webhook] replyRes.status", replyRes.status, "body", responseBody);
    return { ok: true, status: replyRes.status, errorMessage: null, skipped: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Reply API fetch failed";
    console.error("[line-webhook] reply fetch error", errorMessage);
    return { ok: false, status: 0, errorMessage, skipped: false };
  }
}
