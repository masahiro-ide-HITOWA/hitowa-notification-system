'use client';

import React, { useState } from 'react';
import { 
  BellRing, 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Send, 
  MessageSquareCode as SlackIcon, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Sparkles,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export default function MyPage() {
  // チャネル設定のローカル状態
  const [channels, setChannels] = useState({
    googleChat: { enabled: true, isAutoManaged: true, email: 'yamada.t@hitowa.com' },
    line: { enabled: false, isConnected: false },
    slack: { enabled: false, isConnected: true, workspace: 'HITOWA Group' },
  });

  // LINE連携コード生成ステート
  const [lineToken, setLineToken] = useState<string | null>(null);

  const toggleChannel = (key: 'googleChat' | 'line' | 'slack') => {
    setChannels(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }));
  };

  const generateLineToken = () => {
    // 6桁のワンタイムトークン生成
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    setLineToken(token);
  };

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
            <a href="/" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition">
              マイ通知
            </a>
            <a href="/mypage" className="px-3 py-1.5 rounded-lg bg-indigo-600 font-bold text-white shadow">
              設定
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* ページタイトル */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              通知チャネル連携設定
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              各メッセージングツールへのプッシュ通知のON/OFFおよびアカウント連携を管理します。
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs self-start md:self-auto">
            <span className="text-slate-500">社員ID:</span>
            <strong className="text-slate-800 ml-1">E12345 (山田 太郎)</strong>
            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">本部社員</span>
          </div>
        </div>

        {/* チャネルリスト */}
        <div className="space-y-4">
          
          {/* 1. Google Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Google Chat</h2>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> SAML自動連動
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    本部社員アカウント（Google Workspace）宛てにBotダイレクトメッセージを送信します。
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    連携アドレス: {channels.googleChat.email}
                  </p>
                </div>
              </div>

              {/* トグルスイッチ */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  {channels.googleChat.enabled ? '有効' : '無効'}
                </span>
                <button
                  onClick={() => toggleChannel('googleChat')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    channels.googleChat.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      channels.googleChat.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 2. LINE 公式アカウント */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">LINE</h2>
                    {channels.line.isConnected ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 連携済み
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> 未連携
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    HITOWA公式LINEアカウント経由で個人スマホにプッシュ通知を届けます（現場社員に推奨）。
                  </p>
                </div>
              </div>

              {/* トグルスイッチ */}
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  {channels.line.enabled ? '有効' : '無効'}
                </span>
                <button
                  onClick={() => toggleChannel('line')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    channels.line.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      channels.line.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* LINE連携手続きエリア（連携コード発行機能） */}
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3.5 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  LINEアカウント連携手順
                </span>
                <button
                  onClick={generateLineToken}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  連携コード発行
                </button>
              </div>

              {lineToken && (
                <div className="bg-white border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-slate-500 text-[11px]">HITOWA公式LINEのトーク画面で以下のワンタイムコードを送信してください:</p>
                    <p className="text-lg font-mono font-bold text-emerald-700 tracking-wider mt-0.5">{lineToken}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">※有効期限: 10分</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Slack Bot */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                  <SlackIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Slack</h2>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 連携済み ({channels.slack.workspace})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Slackワークスペース内のHITOWA Notification Botからダイレクトメッセージを受信します。
                  </p>
                </div>
              </div>

              {/* トグルスイッチ */}
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  {channels.slack.enabled ? '有効' : '無効'}
                </span>
                <button
                  onClick={() => toggleChannel('slack')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    channels.slack.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      channels.slack.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* 戻るリンク */}
        <div className="pt-2 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
          >
            マイ通知一覧に戻る
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}