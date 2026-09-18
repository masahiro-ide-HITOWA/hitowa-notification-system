'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { MypageLinkedPanel } from '@/components/mypage-linked-panel';
import { MypageNotificationsLink } from '@/components/mypage-notifications-link';
import { MypagePendingCodePanel } from '@/components/mypage-pending-code-panel';
import { MypageProfileCard } from '@/components/mypage-profile-card';
import { DEMO_USER_PROFILE } from '@/lib/saml-user-attributes';

export default function MyPage() {
  const userProfile = DEMO_USER_PROFILE;

  const [loading, setLoading] = useState(false);
  const [codeData, setCodeData] = useState<{
    oneTimeCode: string;
    expiresAt: string;
    lineAddFriendUrl: string;
  } | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/line/issue-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile.portalUserId,
        },
        body: JSON.stringify({
          portalUserId: userProfile.portalUserId,
          attributes: userProfile,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeData(data);
        setIsLinked(false);
      } else {
        alert('コード発行に失敗しました: ' + (data.error || ''));
      }
    } catch {
      alert('予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!codeData || isLinked) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/line/check-status?code=' + codeData.oneTimeCode);
        const data = await res.json();

        if (data.success && data.status === 'COMPLETED') {
          setIsLinked(true);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [codeData, isLinked]);

  const handleCopyCode = () => {
    if (!codeData?.oneTimeCode) return;
    navigator.clipboard.writeText(codeData.oneTimeCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUnlink = async () => {
    if (!confirm('LINE連携を解除しますか？')) return;

    setUnlinking(true);
    try {
      const res = await fetch('/api/line/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile.portalUserId,
        },
        body: JSON.stringify({ portalUserId: userProfile.portalUserId }),
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (data.success) {
        setIsLinked(false);
        setCodeData(null);
      } else {
        alert('連携解除に失敗しました: ' + (data.message || ''));
      }
    } catch {
      alert('予期せぬエラーが発生しました');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />

      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-5">
        <MypageProfileCard userProfile={userProfile} isLinked={isLinked} />
        <div>
          <MypageNotificationsLink portalUserId={userProfile.portalUserId} />
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

            <div className="bg-indigo-50/70 rounded-xl p-5 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-3">
              <h2 className="text-xs font-bold text-indigo-950">
                🛡️ あなたの6桁連携ワンタイムコード
              </h2>

              {isLinked ? (
                <MypageLinkedPanel unlinking={unlinking} onUnlink={handleUnlink} />
              ) : !codeData ? (
                <button
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
                >
                  {loading ? '発行中...' : '📱 ワンタイム連携コードを発行する'}
                </button>
              ) : (
                <MypagePendingCodePanel
                  codeData={codeData}
                  isCopied={isCopied}
                  onCopy={handleCopyCode}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}