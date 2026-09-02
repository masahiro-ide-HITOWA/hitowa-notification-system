'use client';

import React, { useState } from 'react';
import { 
  BellRing, 
  LayoutDashboard, 
  Settings, 
  Mail, 
  Plus, 
  RefreshCw, 
  Search, 
  Inbox, 
  Send, 
  Trash2, 
  Paperclip, 
  Clock, 
  X,
  ArrowLeft
} from 'lucide-react';

interface MailItem {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
}

export default function WebMailPage() {
  const [mails, setMails] = useState<MailItem[]>([
    {
      id: '1',
      fromName: 'HITOWA総務部',
      fromAddress: 'somu@hitowa.com',
      subject: '【連絡】9月の定例清掃および設備点検の日程について',
      preview: '各施設の現場スタッフの皆様、お疲れ様です。9月の定例清掃スケジュールをお知らせいたします。',
      body: `各施設の現場スタッフの皆様

お疲れ様です。総務部です。
2026年9月の定例清掃および設備点検の日程について、以下の通りご連絡いたします。

【日時】2026年9月15日(火) 10:00〜15:00
【対象】全事業所・現場オフィス

作業時間中は一部共有スペースの利用が制限されますので、事前にご確認をお願いいたします。
添付のPDF資料も併せてご確認ください。

よろしくお願いいたします。`,
      date: '10:30',
      isRead: false,
      hasAttachment: true,
    },
    {
      id: '2',
      fromName: 'カオナビ通知システム',
      fromAddress: 'no-reply@kaonavi.jp',
      subject: '【カオナビ】評価シートの提出依頼が届いています',
      preview: '2026年度上期 目標設定評価シートの入力期限が近づいています。マイ通知一覧からも確認できます。',
      body: `※このメールはシステムからの自動送信です。

目標設定評価シートの提出期日は今月末までとなっております。
ポータルの「マイ通知一覧」または以下のリンクからカオナビにアクセスの上、入力をお願いします。`,
      date: '昨日',
      isRead: true,
      hasAttachment: false,
    },
    {
      id: '3',
      fromName: 'エリアマネージャー 佐藤',
      fromAddress: 'sato.m@hitowa.com',
      subject: '来週のシフト確認のお願い',
      preview: 'お疲れ様です。来週分のシフト調整が完了しましたので、確認をお願いします。',
      body: `お疲れ様です。佐藤です。

来週の現場シフト表を確定させました。
変更点やご都合が悪い日がありましたら、明日17時までに返信をお願いいたします。`,
      date: '9月1日',
      isRead: true,
      hasAttachment: false,
    },
  ]);

  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [filterFolder, setFilterFolder] = useState<'inbox' | 'sent'>('inbox');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 新規メールフォームの状態
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // 手動メール更新（IMAPオンデマンド受信のシミュレーション）
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // メール選択・既読化
  const handleSelectMail = (mail: MailItem) => {
    setSelectedMail(mail);
    setMails(prev =>
      prev.map(m => (m.id === mail.id ? { ...m, isRead: true } : m))
    );
  };

  // メール送信処理（SMTP送信シミュレーション）
  const handleSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`メールを送信しました: ${composeTo}`);
    setIsComposeOpen(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const filteredMails = mails.filter(
    mail =>
      mail.subject.includes(searchQuery) ||
      mail.fromName.includes(searchQuery) ||
      mail.preview.includes(searchQuery)
  );

  const unreadCount = mails.filter(m => !m.isRead).length;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      {/* 共通ナビゲーションヘッダー */}
      <header className="bg-slate-900 text-white p-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-400">
            <BellRing className="w-5 h-5" />
            <span className="hidden sm:inline">HITOWA統合通知ポータル</span>
            <span className="sm:hidden text-sm">HITOWAポータル</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            <a
              href="/"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold flex items-center gap-1 text-slate-300 transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">マイ通知</span>
            </a>
            <a
              href="/mail"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 font-bold flex items-center gap-1 text-white shadow"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Webメール</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </a>
            <a
              href="/mypage"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold flex items-center gap-1 text-slate-300 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">設定</span>
            </a>
          </div>
        </div>
      </header>

      {/* メインコンテンツエリア */}
      <main className="max-w-6xl mx-auto w-full flex-1 p-3 sm:p-6 flex flex-col">
        {/* 上部アクションバー */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsComposeOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>新規作成</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
                title="メールを受信 (IMAP同期)"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden md:inline">受信用更新</span>
              </button>
            </div>

            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">KAGOYA:</span> yamada.t@hitowa.com
            </div>
          </div>

          {/* 検索ボックス */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="メール検索 (件名・差出人)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* 2カラムレイアウト (メールリスト ＆ メール詳細) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
          {/* 左側: サイドフォルダ ＆ メール一覧 */}
          <div
            className={`md:col-span-5 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col ${
              selectedMail ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* フォルダタブ */}
            <div className="p-2 border-b border-slate-100 flex items-center gap-1 bg-slate-50/50 rounded-t-xl text-xs font-bold">
              <button
                onClick={() => setFilterFolder('inbox')}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
                  filterFolder === 'inbox'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                受信トレイ ({mails.length})
              </button>
              <button
                onClick={() => setFilterFolder('sent')}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
                  filterFolder === 'sent'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                送信済み
              </button>
            </div>

            {/* メールリスト */}
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] flex-1">
              {filteredMails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  該当するメールはありません
                </div>
              ) : (
                filteredMails.map(mail => (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectMail(mail)}
                    className={`p-3.5 cursor-pointer transition hover:bg-slate-50 flex flex-col gap-1 ${
                      selectedMail?.id === mail.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''
                    } ${!mail.isRead ? 'font-bold bg-white' : 'opacity-75'}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`truncate max-w-[160px] ${!mail.isRead ? 'text-indigo-950 font-bold' : 'text-slate-700'}`}>
                        {mail.fromName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        {mail.hasAttachment && <Paperclip className="w-3 h-3 text-slate-400" />}
                        {mail.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-900 truncate">
                      {!mail.isRead && <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full mr-1.5"></span>}
                      {mail.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 font-normal">
                      {mail.preview}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右側: メール本文プレビュー */}
          <div
            className={`md:col-span-7 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-4 md:p-6 ${
              !selectedMail ? 'hidden md:flex items-center justify-center' : 'flex'
            }`}
          >
            {selectedMail ? (
              <div className="flex flex-col h-full space-y-4">
                {/* スマホ用戻るボタン */}
                <button
                  onClick={() => setSelectedMail(null)}
                  className="md:hidden self-start flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>一覧に戻る</span>
                </button>

                {/* メールヘッダー */}
                <div className="border-b border-slate-100 pb-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h1 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                      {selectedMail.subject}
                    </h1>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button className="p-1 hover:bg-slate-100 rounded transition" title="削除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800">{selectedMail.fromName}</span>
                      <span className="text-slate-400 ml-1.5">&lt;{selectedMail.fromAddress}&gt;</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{selectedMail.date}</span>
                    </div>
                  </div>
                </div>

                {/* メール本文 */}
                <div className="flex-1 py-2 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap overflow-y-auto">
                  {selectedMail.body}
                </div>

                {/* 返信アクションボタン */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setComposeTo(selectedMail.fromAddress);
                      setComposeSubject(`Re: ${selectedMail.subject}`);
                      setIsComposeOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>返信する</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-2">
                <Mail className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">左側のリストからメールを選択してください</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 新規メール作成モーダル */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" />
                新規メール作成 (KAGOYA SMTP送信)
              </span>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMail} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">宛先 (To):</label>
                <input
                  type="email"
                  required
                  placeholder="example@hitowa.com"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">件名 (Subject):</label>
                <input
                  type="text"
                  required
                  placeholder="件名を入力してください"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">本文:</label>
                <textarea
                  required
                  rows={6}
                  placeholder="本文を入力してください..."
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>送信する</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}