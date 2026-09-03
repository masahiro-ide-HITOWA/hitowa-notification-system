'use client';

import React, { useState } from 'react';
import { 
  BellRing, 
  LayoutDashboard, 
  Settings, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  UserCheck,
  FileText,
  Building2
} from 'lucide-react';

interface NotificationItem {
  id: string;
  sourceApp: 'kaonavi' | 'tokium' | 'crowdhouse';
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  actionUrl: string;
  category: '承認依頼' | 'お知らせ' | 'タスク';
}

export function NotificationInbox() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      sourceApp: 'kaonavi',
      title: '【カオナビ】評価シートの提出依頼',
      description: '2026年度上期 目標設定評価シートの入力期限が近づいています。',
      createdAt: '10分前',
      isRead: false,
      actionUrl: 'https://kaonavi.example.com',
      category: '承認依頼',
    },
    {
      id: '2',
      sourceApp: 'tokium',
      title: '【TOKIUM】経費精算の承認申請',
      description: '山田 太郎様より「8月度 出張旅費精算（¥15,400）」が申請されました。',
      createdAt: '1時間前',
      isRead: false,
      actionUrl: 'https://tokium.example.com',
      category: '承認依頼',
    },
    {
      id: '3',
      sourceApp: 'crowdhouse',
      title: '【クラウドハウス労務】入社手続き書類の確認',
      description: '新入社員の中村様より提出された入社関連書類の確認をお願いします。',
      createdAt: '3時間前',
      isRead: true,
      actionUrl: 'https://crowdhouse.example.com',
      category: 'タスク',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-12">
      {/* ナビゲーションヘッダー */}
      <header className="bg-slate-900 text-white p-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-400">
            <BellRing className="w-5 h-5" />
            <span>HITOWA統合通知ポータル</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <a 
              href="/" 
              className="px-3 py-1.5 rounded-lg bg-indigo-600 font-bold flex items-center gap-1 text-white shadow"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>マイ通知</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </a>
            <a 
              href="/mypage" 
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold flex items-center gap-1 text-slate-300 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>設定</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              マイ通知一覧
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              社内各種SaaSからの届いた承認・タスク通知を一括管理します。
            </p>
          </div>

          <div className="flex items-center gap-2 border bg-slate-50 p-1 rounded-lg text-xs self-start md:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              すべて ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 ${
                filter === 'unread'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              未読のみ
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredNotifications.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 md:p-5 transition shadow-sm hover:shadow-md ${
                !item.isRead ? 'border-l-4 border-l-indigo-600 border-slate-200 bg-indigo-50/20' : 'border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {item.sourceApp === 'kaonavi' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> カオナビ
                    </span>
                  )}
                  {item.sourceApp === 'tokium' && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold flex items-center gap-1">
                      <FileText className="w-3 h-3" /> TOKIUM
                    </span>
                  )}
                  {item.sourceApp === 'crowdhouse' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> クラウドハウス
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 border px-1.5 py-0.2 rounded">
                    {item.category}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" /> {item.createdAt}
                </span>
              </div>

              <h2 className="text-sm md:text-base font-bold text-slate-900 mt-2">
                {item.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {item.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {!item.isRead ? (
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    既読にする
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 既読済み
                  </span>
                )}

                <a
                  href={item.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markAsRead(item.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <span>該当サービスを開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// デフォルトエクスポートも追加（どの形式のインポートでも対応できるように設定）
export default NotificationInbox;