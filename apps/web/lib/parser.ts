import { simpleParser, ParsedMail } from 'mailparser';
import { ParsedNotification } from './line';

/**
 * 送信元（From）や件名・本文からSaaS名および通知情報を抽出・構造化する関数
 */
export async function parseSaaSNotificationMail(
  rawMailContent: string | Buffer
): Promise<ParsedNotification | null> {
  const parsed: ParsedMail = await simpleParser(rawMailContent);

  const fromAddress = parsed.from?.value[0]?.address || '';
  const subject = parsed.subject || '';
  const textBody = parsed.text || '';

  // 1. カオナビ からの通知メールの解析
  if (fromAddress.includes('kaonavi.jp') || subject.includes('【カオナビ】')) {
    // 例: 本文内の "社員番号：00400611" または宛先メールアドレスのユーザー名から社員IDを抽出
    const empIdMatch = textBody.match(/社員番号[：:]\s*([A-Za-z0-0]+)/) || textBody.match(/([0-9]{6,8})/);
    const deadlineMatch = textBody.match(/提出期限[：:]\s*([0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}|[0-9]{1,2}月[0-9]{1,2}日)/);
    const urlMatch = textBody.match(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()=[\]]+kaonavi\.jp[\w!?/+\-_~;.,*&@#$%()=[\]]*)/);

    return {
      employeeId: empIdMatch ? empIdMatch[1] : 'UNKNOWN',
      saasName: 'カオナビ',
      title: subject.replace(/【カオナビ】/g, '').trim() || '評価・ワークフロー手続きの案内',
      summary: textBody.slice(0, 100).replace(/\n/g, ' ') + '...',
      actionUrl: urlMatch ? urlMatch[1] : 'https://kaonavi.jp',
      deadline: deadlineMatch ? deadlineMatch[1] : undefined,
      badgeColor: '#2563EB', // カオナビ ブルー
    };
  }

  // 2. TOKIUM (経費精算/インボイス) からの通知メールの解析
  if (fromAddress.includes('keihi.com') || fromAddress.includes('tokium.jp') || subject.includes('【TOKIUM】')) {
    const empIdMatch = textBody.match(/社員コード[：:]\s*([A-Za-z0-9]+)/) || textBody.match(/([0-9]{6,8})/);
    const urlMatch = textBody.match(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()=[\]]+tokium\.jp[\w!?/+\-_~;.,*&@#$%()=[\]]*)/);

    return {
      employeeId: empIdMatch ? empIdMatch[1] : 'UNKNOWN',
      saasName: 'TOKIUM',
      title: subject.replace(/【TOKIUM】/g, '').trim() || '経費精算・申請の承認依頼',
      summary: textBody.slice(0, 100).replace(/\n/g, ' ') + '...',
      actionUrl: urlMatch ? urlMatch[1] : 'https://keihi.com',
      badgeColor: '#059669', // TOKIUM グリーン
    };
  }

  // 3. クラウドハウス労務 からの通知メールの解析
  if (fromAddress.includes('cloudhouse.jp') || subject.includes('【クラウドハウス】')) {
    const empIdMatch = textBody.match(/社員番号[：:]\s*([A-Za-z0-9]+)/) || textBody.match(/([0-9]{6,8})/);
    const deadlineMatch = textBody.match(/回答期限[：:]\s*([0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}|[0-9]{1,2}月[0-9]{1,2}日)/);
    const urlMatch = textBody.match(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()=[\]]+cloudhouse\.jp[\w!?/+\-_~;.,*&@#$%()=[\]]*)/);

    return {
      employeeId: empIdMatch ? empIdMatch[1] : 'UNKNOWN',
      saasName: 'クラウドハウス労務',
      title: subject.replace(/【クラウドハウス労務】/g, '').trim() || '労務手続き・書類回答のお願い',
      summary: textBody.slice(0, 100).replace(/\n/g, ' ') + '...',
      actionUrl: urlMatch ? urlMatch[1] : 'https://cloudhouse.jp',
      deadline: deadlineMatch ? deadlineMatch[1] : undefined,
      badgeColor: '#D97706', // クラウドハウス アンバー
    };
  }

  // 対象外のメールの場合
  return null;
}