import { NextResponse } from "next/server";
import type { webhook } from "@line/bot-sdk";
import { completeLineLinkByCode } from "@/lib/line-mapping-complete";
import { replyLineText } from "@/lib/line-reply";

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

async function handlePairingCode(userText: string, lineUserId: string, replyToken: string): Promise<void> {
  console.log("[line-webhook] userText", userText);
  const result = await completeLineLinkByCode(userText, lineUserId);
  if (result.ok) {
    await replyLineText(replyToken, replyText("linked"));
    return;
  }
  await replyLineText(replyToken, replyText(result.reason));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { events?: webhook.Event[] };
    const events = body.events ?? [];

    if (events.length === 0) {
      return NextResponse.json({ message: "OK (Verification Success)" }, { status: 200 });
    }

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text" || !event.replyToken) {
        continue;
      }
      const userText = event.message.text.trim();
      const lineUserId = readLineUserId(event);
      if (/^\d{6}$/.test(userText) && lineUserId) {
        await handlePairingCode(userText, lineUserId, event.replyToken);
      } else {
        console.log("[line-webhook] userText", userText);
        await replyLineText(event.replyToken, replyText("need_code"));
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[line-webhook] Webhook Error:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
