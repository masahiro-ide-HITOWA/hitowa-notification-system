import { NextResponse } from "next/server";
import { messagingApi } from "@line/bot-sdk";
import type { webhook } from "@line/bot-sdk";
import { completeLineLinkByCode } from "@/lib/line-mapping-complete";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const client = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

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

async function reply(replyToken: string, text: string): Promise<void> {
  if (!channelAccessToken) {
    return;
  }
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

async function handlePairingCode(code: string, lineUserId: string, replyToken: string): Promise<void> {
  const result = await completeLineLinkByCode(code, lineUserId);
  if (result.ok) {
    await reply(replyToken, replyText("linked"));
    return;
  }
  await reply(replyToken, replyText(result.reason));
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
      const userMessage = event.message.text.trim();
      const lineUserId = readLineUserId(event);
      if (/^\d{6}$/.test(userMessage) && lineUserId) {
        await handlePairingCode(userMessage, lineUserId, event.replyToken);
      } else {
        await reply(event.replyToken, replyText("need_code"));
      }
    }

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ message: "Success" }, { status: 200 });
  }
}
