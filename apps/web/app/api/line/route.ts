import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookEvent, TextMessage } from '@line/bot-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const lineClient = new Client(lineConfig);

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USER_TABLE_NAME = process.env.DYNAMODB_USER_TABLE || 'HitowaUserMappings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: WebhookEvent[] = body.events || [];

    for (const event of events) {
      // メッセージ送信イベントかつテキストメッセージの場合
      if (event.type === 'message' && event.message.type === 'text') {
        const textMessage = event.message as TextMessage;
        const userText = textMessage.text.trim();
        const lineUserId = event.source.userId;

        if (!lineUserId) continue;

        // 6桁の数字コード（ワンタイムコード）か判定
        if (/^\d{6}$/.test(userText)) {
          // 自システムの 6桁コード検証API (/api/auth/code) に照合リクエスト
          const host = request.headers.get('host') || 'localhost:3000';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          
          const verifyRes = await fetch(`${protocol}://${host}/api/auth/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: userText, lineUserId }),
          });

          const verifyResult = await verifyRes.json();

          if (verifyResult.success) {
            // DynamoDB に社員ID ⇄ LINE User ID を保存
            await docClient.send(
              new PutCommand({
                TableName: USER_TABLE_NAME,
                Item: {
                  employeeId: verifyResult.employeeId,
                  lineUserId,
                  linkedAt: new Date().toISOString(),
                },
              })
            );

            // 連携完了の応答メッセージをLINEに返信
            await lineClient.replyMessage(event.replyToken, {
              type: 'text',
              text: `【連携完了】\n社員番号: ${verifyResult.employeeId} 様のLINEアカウント連携が完了しました！\n\n今後はSaaS通知（カオナビ・TOKIUM・クラウドハウス労務等）がこのトークにカード型で即時配信されます。`,
            });
          } else {
            // コード無効・期限切れ時のエラー返信
            await lineClient.replyMessage(event.replyToken, {
              type: 'text',
              text: `【連携失敗】\n${verifyResult.message || '無効なコードです。'}\nマイページから再度6桁コードを発行してください。`,
            });
          }
        } else {
          // 6桁以外のテキストの場合の自動応答
          await lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: `HITOWA統合通知ポータルです。\nポータル画面で発行した【半角6桁の連携コード】をこのトークへ送信してください。`,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LINE Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}