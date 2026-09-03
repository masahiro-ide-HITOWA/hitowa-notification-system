import { NextRequest, NextResponse } from 'next/server';
import { parseSaaSNotificationMail } from '@/lib/parser';
import { sendLineNotification } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    // 簡易セキュリティ認証 (API Key ヘッダー検証)
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.WEBHOOK_SECRET_KEY || 'hitowa_secret_key_2026';

    if (apiKey !== validApiKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: 無効なAPIキーです。' },
        { status: 401 }
      );
    }

    // リクエストボディ（MIME形式データまたはRAWメールテキスト）を取得
    const rawMailContent = await request.text();

    if (!rawMailContent || rawMailContent.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Bad Request: メール本文が空です。' },
        { status: 400 }
      );
    }

    // STEP 1: メール解析エンジン (Mail Parser) によるSaaS通知データの構造化
    const notificationData = await parseSaaSNotificationMail(rawMailContent);

    if (!notificationData) {
      return NextResponse.json({
        success: true,
        message: '解析対象外のメールであったため、処理をスキップしました。',
      });
    }

    if (notificationData.employeeId === 'UNKNOWN') {
      console.warn('社員IDの特定に失敗したため、LINE送信をスキップします:', notificationData);
      return NextResponse.json({
        success: false,
        message: 'メール本文から対象社員IDを抽出できませんでした。',
        parsedData: notificationData,
      });
    }

    // STEP 2: DynamoDB検索 ＆ LINE Messaging API 経由での Push 通知送信
    const sendResult = await sendLineNotification(notificationData);

    if (sendResult) {
      return NextResponse.json({
        success: true,
        message: `社員ID: ${notificationData.employeeId} への LINE Push 通知が正常に完了しました。`,
        data: notificationData,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `LINE Push 通知の送信に失敗しました（LINE User IDが未連携の可能性があります）。`,
          data: notificationData,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Webhookメール処理エラー:', error);
    return NextResponse.json(
      { success: false, message: 'サーバー内部エラーが発生しました。', error: error.message },
      { status: 500 }
    );
  }
}