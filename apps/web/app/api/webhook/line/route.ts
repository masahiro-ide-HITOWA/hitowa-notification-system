import { NextResponse } from "next/server";
import type { webhook } from "@line/bot-sdk";
import {
  persistCompletedLink,
  persistLineReplyDebug,
  prepareLineLinkByCode,
} from "@/lib/line-mapping-complete";
import {
  lineReplyResponseHeaders,
  replyLineText,
  type LineReplyResult,
} from "@/lib/line-reply";

function readLineUserId(event: webhook.Event): string | null {
  if (event.source?.type === "user" && typeof event.source.userId === "string") {
    return event.source.userId;
  }
  return null;
}

function replyText(reason: "linked" | "not_found" | "expired" | "update_failed" | "need_code"): string {
  if (reason === "linked") {
    return "HITOWAポータルとのLINE連携が完了しました。";
  }
  if (reason === "expired") {
    return "連携コードの有効期限が切れています。ポータルで新しいコードを発行してください。";
  }
  if (reason === "need_code") {
    return "ポータル画面で発行された6桁の連携コードを送信してください。";
  }
  return "連携コードが見つかりません。ポータルで発行した6桁コードを確認して、もう一度送信してください。";
}

async function handlePairingCode(
  userText: string,
  lineUserId: string,
  replyToken: string
): Promise<LineReplyResult> {
  console.log("[line-webhook] userText", userText);
  const prepared = await prepareLineLinkByCode(userText);
  const text = prepared.ok ? replyText("linked") : replyText(prepared.reason);
  const persistPromise = prepared.ok
    ? persistCompletedLink(prepared.key, lineUserId)
    : Promise.resolve();
  const [reply] = await Promise.all([replyLineText(replyToken, text), persistPromise]);
  if (!reply.ok && prepared.ok) {
    try {
      await persistLineReplyDebug(prepared.key, reply.status, reply.errorMessage);
    } catch (error) {
      console.error("[line-webhook] failed to persist lastReplyStatus", error);
    }
  }
  return reply;
}

async function handleTextEvent(event: webhook.Event): Promise<LineReplyResult | null> {
  if (event.type !== "message" || event.message.type !== "text" || !event.replyToken) {
    return null;
  }
  const userText = event.message.text.trim();
  const lineUserId = readLineUserId(event);
  if (/^\d{6}$/.test(userText) && lineUserId) {
    return handlePairingCode(userText, lineUserId, event.replyToken);
  }
  console.log("[line-webhook] userText", userText);
  return replyLineText(event.replyToken, replyText("need_code"));
}

export async function POST(req: Request) {
  let lastReply: LineReplyResult | null = null;
  try {
    const body = (await req.json()) as { events?: webhook.Event[] };
    const events = body.events ?? [];

    if (events.length === 0) {
      return NextResponse.json({ message: "OK (Verification Success)" }, { status: 200 });
    }

    const replies = await Promise.all(events.map((event) => handleTextEvent(event)));
    lastReply = replies.filter((item): item is LineReplyResult => item !== null).at(-1) ?? null;

    return NextResponse.json(
      { success: true },
      { status: 200, headers: lastReply ? lineReplyResponseHeaders(lastReply) : undefined }
    );
  } catch (error) {
    console.error("[line-webhook] Webhook Error:", error);
    return NextResponse.json(
      { success: true },
      { status: 200, headers: lastReply ? lineReplyResponseHeaders(lastReply) : undefined }
    );
  }
}
