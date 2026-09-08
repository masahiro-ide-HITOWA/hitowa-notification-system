'use client';

import { useState } from 'react';
import Header from '@/components/Header';

export default function MyPage() {
  const [code, setCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/code', {
        headers: { 'x-user-id': '00400611' },
      });
      const data = await res.json();
      if (data.success) {
        setCode(data.code);
      } else {
        alert('コード発行に失敗しました');
      }
    } catch {
      // フォールバック生成
      setCode(Math.floor(100000 + Math.random() * 900000).toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />

      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-5">
        {/* プロフィールカード */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">山田 太郎</h1>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[11px] rounded border border-indigo-100">
                現場社員
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              社員番号: <span className="font-mono font-bold text-slate-700">00400611</span> │ 所属: HITOWAキッズライフ 恵比寿保育園
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
            ⚠️ LINE未連携
          </span>
        </div>

        {/* LINE連携設定カード */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center text-xs font-bold">
            <span>💬 LINE Push通知連携 (BYOD設定)</span>
            <span className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
              推奨設定
            </span>
          </div>

          <div className="p-5 space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              カオナビ・TOKIUM・クラウドハウス労務などの業務通知を個人のスマホ（LINE）へ即時Push通知します。
              以下の手順で6桁コードを発行し、LINE公式アカウントのトーク画面へ送信してください。
            </p>

            {/* 手順ステップ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">1</div>
                <h2 className="font-bold text-slate-800">連携コードを発行</h2>
                <p className="text-slate-500 text-[11px]">下のボタンを押して10分間有効な6桁コードを発行します。</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">2</div>
                <h2 className="font-bold text-slate-800">LINE公式アカウントを開く</h2>
                <p className="text-slate-500 text-[11px]">「HITOWA通知ポータル」公式LINEのトーク画面を開きます。</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">3</div>
                <h2 className="font-bold text-slate-800">コードを送信して連携</h2>
                <p className="text-slate-500 text-[11px]">トーク画面に6桁コードを送信すると紐付けが完了します。</p>
              </div>
            </div>

            {/* コード発行・操作エリア */}
            <div className="bg-indigo-50/70 rounded-xl p-5 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-3">
              <h2 className="text-xs font-bold text-indigo-950">
                🛡️ あなたの6桁連携ワンタイムコード
              </h2>

              {!code ? (
                <button
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
                >
                  {loading ? '発行中...' : '📱 ワンタイム連携コードを発行する'}
                </button>
              ) : (
                <div className="space-y-3 w-full max-w-xs">
                  <div className="bg-white px-5 py-2.5 rounded-xl border-2 border-indigo-600 shadow-inner flex items-center justify-between">
                    <span className="font-mono font-extrabold text-2xl tracking-[0.2em] text-indigo-900">
                      {code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition"
                    >
                      {isCopied ? 'コピー完了!' : 'コピー'}
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-700 font-semibold">
                    ⏳ 有効期限: 発行から10分間
                  </p>

                  <a
                    href="https://line.me/ti/p/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-lg text-xs transition shadow-sm block text-center"
                  >
                    💬 公式LINEを開いてコードを送信する ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}