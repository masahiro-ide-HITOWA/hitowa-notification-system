'use client';

import { useState } from 'react';
import Header from '@/components/Header';

interface NotificationItem {
  id: string;
  saasName: string;
  title: string;
  summary: string;
  date: string;
  deadline?: string;
  actionUrl: string;
  badgeClass: string;
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    saasName: 'カオナビ (評価・人事)',
    title: '2026年度上期 人事評価シート提出のお願い',
    summary: '山田 太郎 様、2026年度上期評価シートの入力期限が迫っています。期日までにカオナビよりご提出をお願いいたします。',
    date: '2026/09/08',
    deadline: '2026/09/15',
    actionUrl: 'https://p.kaonavi.jp',
    badgeClass: 'bg-blue-600',
  },
  {
    id: '2',
    saasName: 'TOKIUM経費精算',
    title: '8月分 交通費・経費申請の差し戻し連絡',
    summary: '申請ID: #TK-8820 領収書画像の解像度が不足しているため差し戻されました。再アップロードをお願いします。',
    date: '2026/09/07',
    deadline: '2026/09/10',
    actionUrl: 'https://www.keihi.com',
    badgeClass: 'bg-emerald-600',
  },
  {
    id: '3',
    saasName: 'クラウドハウス労務',
    title: '定期健康診断 問診票の回答手続き',
    summary: '今年度の定期健康診断に向けた事前Web問診票の回答フォームが公開されました。',
    date: '2026/09/05',
    deadline: '2026/09/20',
    actionUrl: 'https://cloudhouse.jp',
    badgeClass: 'bg-purple-600',
  },
];

export default function Home() {
  const [filter, setFilter] = useState('すべて');

  const filteredItems = filter === 'すべて'
    ? mockNotifications
    : mockNotifications.filter(item => item.saasName.includes(filter));

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />

      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-4">
        {/* フィルターバー */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['すべて', 'カオナビ', 'TOKIUM', 'クラウドハウス'].map((label) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition whitespace-nowrap ${
                filter === label
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {label} {label === 'すべて' ? `(${mockNotifications.length})` : ''}
            </button>
          ))}
        </div>

        {/* 通知カード一覧 */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition">
              <div className={`${item.badgeClass} text-white px-3 py-2 text-xs font-bold flex justify-between items-center`}>
                <span>{item.saasName}</span>
                <span className="font-mono font-normal text-[11px] opacity-90">{item.date}</span>
              </div>
              <div className="p-3.5 space-y-1.5">
                <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
              </div>
              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                {item.deadline ? (
                  <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">
                    ⏰ 提出期限: {item.deadline}
                  </span>
                ) : (
                  <span />
                )}
                <a
                  href={item.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px]"
                >
                  詳細・手続き画面を開く ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}