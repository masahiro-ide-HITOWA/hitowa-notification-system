import { NextRequest, NextResponse } from 'next/server';

// メモリストア（本番環境ではDynamoDB等のDBで管理）
const codeStore = new Map<string, { employeeId: string; expiresAt: number }>();

/**
 * GET: 6桁の連携用ワンタイムコードを発行
 */
export async function GET(request: NextRequest) {
  const employeeId = request.headers.get('x-user-id') || '00400611';

  // 6桁のランダム数字コードを生成
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10分間有効

  codeStore.set(code, { employeeId, expiresAt });

  return NextResponse.json({
    success: true,
    code,
    employeeId,
    expiresInMinutes: 10,
  });
}

/**
 * POST: LINE Webhook経由で送られてきた6桁コードの検証
 */
export async function POST(request: NextRequest) {
  try {
    const { code, lineUserId } = await request.json();

    if (!code || !lineUserId) {
      return NextResponse.json(
        { success: false, message: 'コードとLINE User IDが必要です。' },
        { status: 400 }
      );
    }

    const record = codeStore.get(code);

    if (!record) {
      return NextResponse.json(
        { success: false, message: '無効または使用済みの連携コードです。' },
        { status: 404 }
      );
    }

    if (Date.now() > record.expiresAt) {
      codeStore.delete(code);
      return NextResponse.json(
        { success: false, message: '連携コードの有効期限（10分）が切れています。' },
        { status: 410 }
      );
    }

    // 検証成功：使用済みコードを削除
    const employeeId = record.employeeId;
    codeStore.delete(code);

    return NextResponse.json({
      success: true,
      message: 'LINEアカウントとの連携が正常に完了しました！',
      employeeId,
      lineUserId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}