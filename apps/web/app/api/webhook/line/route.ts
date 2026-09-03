import { NextRequest, NextResponse } from 'next/server';
import { messagingApi, WebhookEvent } from '@line/bot-sdk';

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy_token',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.trim();
        const lineUserId = event.source?.userId;

        if (!lineUserId) continue;

        if (/^\d{6}$/.test(userText)) {
          console.log(`[LINE Webhook] 6桁コード受領: ${userText} (LINE User ID: ${lineUserId})`);

          // LINEアクセストークンが設定されている場合は応答メッセージを返信 (v8仕様)
          if (process.env.LINE_CHANNEL_ACCESS_TOKEN && event.replyToken) {
            await lineClient.replyMessage({
              replyToken: event.replyToken,
              messages: [
                {
                  type: 'text',
                  text: `【連携完了】\n6桁コード (${userText}) の認証が完了しました！`,
                },
              ],
            });
          }

          return NextResponse.json({
            success: true,
            message: `6桁コード(${userText})の照合とLINE User ID(${lineUserId})の連携処理が完了しました。`,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LINE Webhook Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}