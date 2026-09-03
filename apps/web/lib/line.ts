import { messagingApi } from '@line/bot-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export interface ParsedNotification {
  employeeId: string;
  saasName: string;
  title: string;
  summary: string;
  actionUrl: string;
  deadline?: string;
  badgeColor?: string;
}

// LINE Messaging API クライアント初期化 (v8仕様)
const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy_token',
});

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USER_TABLE_NAME = process.env.DYNAMODB_USER_TABLE || 'HitowaUserMappings';

export async function sendLineNotification(notification: ParsedNotification): Promise<boolean> {
  try {
    // 1. DynamoDB から社員IDに紐付く LINE User ID を取得
    let lineUserId: string | null = null;
    try {
      const getRes = await docClient.send(
        new GetCommand({
          TableName: USER_TABLE_NAME,
          Key: { employeeId: notification.employeeId },
        })
      );
      lineUserId = getRes.Item?.lineUserId || null;
    } catch (e) {
      console.warn('DynamoDB参照失敗 (開発用フォールバック):', e);
    }

    // 開発用ダミーフォールバック
    if (!lineUserId) {
      lineUserId = process.env.DEFAULT_LINE_USER_ID || 'U1234567890abcdef1234567890abcdef';
    }

    // LINE API キー未設定時は開発ログ出力のみでスキップ
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.log(`[LINE送信スキップ] トークン未設定のため、通知オブジェクトを表示:`, notification);
      return true;
    }

    // 2. Flex Message カード型通知オブジェクト構築
    const flexContainer: messagingApi.FlexContainer = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: notification.saasName,
            weight: 'bold',
            color: '#ffffff',
            size: 'xs',
          },
        ],
        backgroundColor: notification.badgeColor || '#2563EB',
        paddingAll: 'sm',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: notification.title,
            weight: 'bold',
            size: 'md',
            wrap: true,
          },
          {
            type: 'text',
            text: notification.summary,
            size: 'xs',
            color: '#666666',
            wrap: true,
            margin: 'md',
          },
          ...(notification.deadline
            ? [
                {
                  type: 'text' as const,
                  text: `提出期限: ${notification.deadline}`,
                  size: 'xs' as const,
                  color: '#ef4444',
                  weight: 'bold' as const,
                  margin: 'md' as const,
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細を開く',
              uri: notification.actionUrl,
            },
            style: 'primary',
            color: notification.badgeColor || '#2563EB',
          },
        ],
      },
    };

    // 3. LINE Push 通知送信 (v8仕様: pushMessage)
    await lineClient.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'flex',
          altText: `【${notification.saasName}】${notification.title}`,
          contents: flexContainer,
        },
      ],
    });

    console.log(`[LINE Push成功] 社員ID: ${notification.employeeId} 宛に送信しました。`);
    return true;
  } catch (error) {
    console.error('LINE Push通知エラー:', error);
    return false;
  }
}