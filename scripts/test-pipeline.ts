import fetch from 'node-fetch';

const BASE_URL = process.env.PORTAL_BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET_KEY = process.env.WEBHOOK_SECRET_KEY || 'hitowa_secret_key_2026';

// 擬似的なカオナビからの評価シート提出依頼メール (RAW MIME / Text)
const mockKaonaviMail = `From: no-reply@kaonavi.jp
To: yamada.t@hitowa.com
Subject: 【カオナビ】2026年度上期 人事評価シート提出のお願い
Date: Thu, 03 Sep 2026 10:00:00 +0900

山田 太郎 様

お疲れ様です。人事部です。
2026年度上期の評価シートの入力期限が近づいております。
以下の内容をご確認の上、期日までにカオナビよりご提出をお願いいたします。

----------------------------------------
■ 対象者情報
社員番号：00400611
提出期限：2026/09/15

■ 入力・提出用URL
https://p.kaonavi.jp/member/evaluations/2026_first_half
----------------------------------------

何卒よろしくお願いいたします。`;

async function runPipelineTest() {
  console.log('==================================================');
  console.log('🚀 HITOWA統合通知ポータル ローカルパイプライン擬似テスト');
  console.log('==================================================\n');

  // STEP 1: 6桁ワンタイムコードの発行テスト
  console.log('【STEP 1】マイページからの6桁ワンタイムコード発行...');
  const codeRes = await fetch(`${BASE_URL}/api/auth/code`, {
    headers: { 'x-user-id': '00400611' }
  });
  const codeData = (await codeRes.json()) as any;
  
  if (!codeData.success) {
    console.error('❌ コード発行失敗:', codeData);
    return;
  }
  
  const generatedCode = codeData.code;
  console.log(`✅ 6桁コード発行成功: ${generatedCode} (社員ID: ${codeData.employeeId})\n`);

  // STEP 2: LINEからのコード送信・アカウント連携テスト
  console.log('【STEP 2】LINE Webhook経由でのアカウント自動連携...');
  const lineWebhookRes = await fetch(`${BASE_URL}/api/webhook/line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        {
          type: 'message',
          replyToken: 'dummy_reply_token_123',
          source: { userId: 'U1234567890abcdef1234567890abcdef' },
          message: { id: 'msg_001', type: 'text', text: generatedCode }
        }
      ]
    })
  });
  const lineWebhookData = (await lineWebhookRes.json()) as any;
  console.log(`✅ LINE 連携処理結果:`, lineWebhookData, '\n');

  // STEP 3: KAGOYA転送SaaSメールの受取 ＆ 解析 ＆ PUSH通知配信テスト
  console.log('【STEP 3】SaaS通知メール受取フック (/api/webhook/mail) のテスト...');
  const mailWebhookRes = await fetch(`${BASE_URL}/api/webhook/mail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'x-api-key': WEBHOOK_SECRET_KEY
    },
    body: mockKaonaviMail
  });
  const mailWebhookData = (await mailWebhookRes.json()) as any;

  console.log(`✅ メールフック処理結果:`);
  console.dir(mailWebhookData, { depth: null });
  console.log('\n==================================================');
  console.log('🎉 パイプラインテスト完了！');
  console.log('==================================================');
}

runPipelineTest().catch(console.error);