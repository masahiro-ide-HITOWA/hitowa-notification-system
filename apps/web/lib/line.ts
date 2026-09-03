import { Client, FlexMessage, FlexContainer } from '@line/bot-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// LINE Client 初期化
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const lineClient = new Client(lineConfig);

// DynamoDB Client 初期化
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USER_TABLE_NAME = process.env.DYNAMODB_USER_TABLE || 'HitowaUserMappings';

// 解析されたSaaS通知データの型定義
export interface ParsedNotification {
  employeeId: string;       // 社員ID (例: "00400611")
  saasName: string;         // SaaS名 ("カオナビ", "TOKIUM", "クラウドハウス労務"等)
  title: string;            // 件名 / タスク名
  summary: string;          // 通知本文の要約 (100文字程度)
  actionUrl: string;        // SaaSまたはポータルへのダイレクトジャンプURL
  deadline?: string;        // 提出期限・申請日
  badgeColor?: string;      // カードヘッダーのテーマ色 (#4F46E5等)
}

/**
 * 社員IDに対応する LINE User ID を DynamoDB から検索する
 */
async function getLineUserIdByEmployeeId(employeeId: string): Promise<string | null> {
  try {
    const command = new GetCommand({
      TableName: USER_TABLE_NAME,
      Key: { employeeId },
    });
    const response = await docClient.send(command);
    return response.Item?.lineUserId || null;
  } catch (error) {
    console.error(`DynamoDB検索エラー (社員ID: ${employeeId}):`, error);
    return null;
  }
}

/**
 * PUSH通知用の LINE Flex Message (カード型) を組み立てる
 */
function createNotificationFlexMessage(notification: ParsedNotification): FlexMessage {
  // SaaSごとのテーマカラー設定
  const headerColor = notification.badgeColor || 
    (notification.saasName === 'カオナビ' ? '#2563EB' :
     notification.saasName === 'TOKIUM' ? '#059669' :
     notification.saasName === 'クラウドハウス労務' ? '#D97706' : '#4F46E5');

  const flexContents: FlexContainer = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerColor,
      paddingAll: 'lg',
      contents: [
        {
          type: 'text',
          text: `【${notification.saasName}】新着通知`,
          color: '#FFFFFF',
          weight: 'bold',
          size: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: notification.title,
          weight: 'bold',
          size: 'md',
          wrap: true,
          color: '#1E293B',
        },
        ...(notification.deadline ? [
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '期限/日時:',
                color: '#64748B',
                size: 'xs',
                flex: 2,
              },
              {
                type: 'text',
                text: notification.deadline,
                color: '#EF4444',
                weight: 'bold',
                size: 'xs',
                flex: 5,
                wrap: true,
              },
            ],
          }
        ] : []),
        {
          type: 'text',
          text: notification.summary,
          color: '#475569',
          size: 'xs',
          wrap: true,
          maxLines: 3,
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '該当タスクを開く',
            uri: notification.actionUrl,
          },
          style: 'primary',
          color: headerColor,
          height: 'sm',
        },
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'マイ通知ポータルへ',
            uri: process.env.PORTAL_BASE_URL || 'https://portal.hitowa.com',
          },
          style: 'secondary',
          height: 'sm',
        },
      ],
    },
  };

  return {
    type: 'flex',
    altText: `【${notification.saasName}】${notification.title}`,
    contents: flexContents,
  };
}

/**
 * 対象社員に LINE Push通知を送信するメイン関数
 */
export async function sendLineNotification(notification: ParsedNotification): Promise<boolean> {
  // 1. DynamoDBから LINE User ID を引き当て
  const lineUserId = await getLineUserIdByEmployeeId(notification.employeeId);

  if (!lineUserId) {
    console.warn(`[LINE送信スキップ] 社員ID: ${notification.employeeId} のLINE連携情報が存在しません。`);
    return false;
  }

  // 2. Flex Messageの構築
  const flexMessage = createNotificationFlexMessage(notification);

  // 3. LINE Messaging API経由でPush送信
  try {
    await lineClient.pushMessage(lineUserId, flexMessage);
    console.log(`[LINE送信成功] 社員ID: ${notification.employeeId} (${notification.saasName})`);
    return true;
  } catch (error: any) {
    console.error(`[LINE送信失敗] 社員ID: ${notification.employeeId}:`, error?.response?.data || error);
    return false;
  }
}