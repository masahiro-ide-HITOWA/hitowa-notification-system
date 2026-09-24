export const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export function lineReplyAuthorizationHeader(token: string): string {
  return `Bearer ${token.trim()}`;
}

export async function replyLineText(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ?? "";
  console.log("[line-webhook] LINE_CHANNEL_ACCESS_TOKEN", {
    hasAccessToken: token !== "",
    tokenLength: token.length,
  });
  if (token === "") {
    console.error("[line-webhook] LINE_CHANNEL_ACCESS_TOKEN is missing; skip Reply API");
    return;
  }

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
    console.error("[line-webhook] replyRes.status", replyRes.status, "body", responseBody);
    return;
  }
  console.log("[line-webhook] replyRes.status", replyRes.status, "body", responseBody);
}
