'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  AlertCircle
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
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [filterFolder, setFilterFolder] = useState<'inbox' | 'sent'>('inbox');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 新規メールフォーム用の状態
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // /api/mail からKAGOYAメールをオンデマンド取得
  const fetchMails = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/mail');
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setMails(result.data);
      } else {
        // KAGOYA未接続時または環境変数未設定時はエラー理由を表示
        setErrorMessage(result.message || 'メールの取得に失敗しました。');
      }
    } catch (error: any) {
      console.error('メール取得エラー:', error);
      setErrorMessage('APIサーバーとの通信に失敗しました。');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 初回レンダリング時に取得
  useEffect(() => {
    fetchMails();
  }, []);

  const handleSelectMail = (mail: MailItem) => {
    setSelectedMail(mail);
    setMails(prev =>
      prev.map(m => (m.id === mail.id ? { ...m, isRead: true } : m))
    );
  };

  const handleSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`メール送信要求を受け付けました: ${composeTo}`);
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
                onClick={fetchMails}
                disabled={isRefreshing}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
                title="KAGOYAメールを受信 (オンデマンドIMAP)"
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
          {/* 左側: フォルダ ＆ メール一覧 */}
          <div
            className={`md:col-span-5 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col ${
              selectedMail ? 'hidden md:flex' : 'flex'
            }`}
          >
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

            {/* メールリスト表示 */}
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] flex-1">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                  <p>KAGOYAからメールを受信中...</p>
                </div>
              ) : errorMessage ? (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg m-3 text-xs flex items-start gap-2 border border-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">IMAP未接続通知</p>
                    <p className="mt-1 text-[11px] text-amber-700">{errorMessage}</p>
                  </div>
                </div>
              ) : filteredMails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  受信トレイは空です
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
                <button
                  onClick={() => setSelectedMail(null)}
                  className="md:hidden self-start flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>一覧に戻る</span>
                </button>

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

                <div className="flex-1 py-2 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap overflow-y-auto">
                  {selectedMail.body}
                </div>

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
                新規メール作成
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