import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import type { webhook } from '@line/bot-sdk';


const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// 最新の @line/bot-sdk 仕様に合わせたクライアント初期化
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: channelAccessToken,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events: WebhookEvent[] = body.events || [];

    // LINE Developers の「検証」ボタンからのダミーリクエスト対策
    if (events.length === 0) {
      return NextResponse.json({ message: 'OK (Verification Success)' }, { status: 200 });
    }

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text.trim();
        const replyToken = event.replyToken;

        if (!replyToken) continue;

        // 6桁の数字（ワンタイムコード）が送信された場合
        if (/^\d{6}$/.test(userMessage)) {
          // TODO: 本番ではここで DynamoDB 等を参照してユーザー検証・紐付けを行います
          await client.replyMessage({
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: `コード【${userMessage}】を受信しました。HITOWAポータルとの連携が完了しました！`,
              },
            ],
          });
        } else {
          await client.replyMessage({
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: 'ポータル画面で発行された6桁の連携コードを送信してください。',
              },
            ],
          });
        }
      }
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}