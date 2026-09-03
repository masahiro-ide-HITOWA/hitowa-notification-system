import { NextRequest, NextResponse } from 'next/server';
import { parseSaaSNotificationMail } from '@/lib/parser';
import { sendLineNotification } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.WEBHOOK_SECRET_KEY || 'hitowa_secret_key_2026';

    if (apiKey !== validApiKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: 無効なAPIキーです。' },
        { status: 401 }
      );
    }

    const rawMailContent = await request.text();

    if (!rawMailContent || rawMailContent.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Bad Request: メール本文が空です。' },
        { status: 400 }
      );
    }

    // 1. メール解析
    const notificationData = await parseSaaSNotificationMail(rawMailContent);

    if (!notificationData) {
      return NextResponse.json({
        success: true,
        message: '解析対象外のメールであったため、処理をスキップしました。',
      });
    }

    // 2. LINE Push送信（環境変数が未設定の場合はスキップされる仕様）
    const sendResult = await sendLineNotification(notificationData);

    return NextResponse.json({
      success: true,
      message: `メール解析・通知パイプライン処理完了`,
      data: notificationData,
      sendResult,
    });
  } catch (error: any) {
    console.error('Mail Webhook Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}