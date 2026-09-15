'use client';

import { useState } from 'react';
import Header from '@/components/Header';

interface MailItem {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
  unread?: boolean;
}

const mockMails: MailItem[] = [
  {
    id: '1',
    sender: 'no-reply@kaonavi.jp',
    subject: '【カオナビ】2026年度上期 人事評価シート提出のお願い',
    date: '09/08 10:00',
    unread: true,
    body: `山田 太郎 様

お疲れ様です。人事部です。
2026年度上期の評価シートの入力期限が近づいております。
以下の内容をご確認の上、期日までにカオナビよりご提出をお願いいたします。

----------------------------------------
■ 対象者情報
社員番号：00400611
提出期限：2026/09/15

■ 入力・提出用URL
/saas/kaonavi/1
----------------------------------------`,
  },
  {
    id: '2',
    sender: 'expense@tokium.jp',
    subject: '【TOKIUM】経費申請差し戻しのお知らせ',
    date: '09/07 15:30',
    body: `山田 太郎 様

TOKIUM経費精算システムです。
申請ID: #TK-8820（8月分 交通費・経費申請）が承認者により差し戻されました。

【理由】
領収書画像の解像度が不足しており、金額が視認できません。再撮影の上アップロードしてください。`,
  },
];

export default function MailPage() {
  const [selectedMail, setSelectedMail] = useState<MailItem>(mockMails[0]);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />

      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center text-xs font-bold">
            <span>📥 KAGOYA 受信トレイ (SaaS転送用通知メール)</span>
            <button
              onClick={() => alert('最新メールを受信しました')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition"
            >
              ↻ 受信用更新
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[420px]">
            {/* メール一覧 */}
            <div className="divide-y divide-slate-100">
              {mockMails.map((mail) => (
                <div
                  key={mail.id}
                  onClick={() => setSelectedMail(mail)}
                  className={`p-3 cursor-pointer text-xs transition ${
                    selectedMail.id === mail.id
                      ? 'bg-sky-50/80 border-l-4 border-l-sky-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate">{mail.sender}</div>
                  <div className="text-slate-600 truncate mt-0.5">{mail.subject}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{mail.date}</div>
                </div>
              ))}
            </div>

            {/* 本文プレビュー */}
            <div className="md:col-span-2 p-4 text-xs space-y-3 bg-white">
              <div className="border-b border-slate-100 pb-3">
                <h1 className="text-sm font-bold text-slate-900">{selectedMail.subject}</h1>
                <p className="text-[11px] text-slate-500 mt-1">
                  差出人: {selectedMail.sender} │ 宛先: yamada.t@hitowa.com
                </p>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                {selectedMail.body}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}