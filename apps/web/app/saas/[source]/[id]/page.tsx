"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import Header from "@/components/Header";
import { getPortalNotification } from "@/lib/portal-notifications";

export default function SaasProcedurePage() {
  const params = useParams<{ source: string; id: string }>();
  const item = useMemo(
    () => getPortalNotification(String(params.source ?? ""), String(params.id ?? "")),
    [params.id, params.source],
  );
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6">
        {!item ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h1 className="text-base font-bold text-slate-900">手続き画面が見つかりません</h1>
            <p className="text-xs text-slate-600">
              指定されたSaaS手続きはデモデータにありません。マイ通知から開き直してください。
            </p>
            <Link href="/" className="inline-block text-xs font-bold text-indigo-600">
              マイ通知へ戻る
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div
              className={`${item.badgeClass} text-white px-4 py-2.5 text-xs font-bold flex justify-between`}
            >
              <span>{item.saasName}</span>
              <span className="font-mono font-normal opacity-90">デモ画面</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h1 className="text-base font-bold text-slate-900">{item.procedureTitle}</h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.summary}</p>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
                {item.procedureSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {submitted ? (
                <p className="text-sm font-bold text-emerald-700">提出を受け付けました（デモ）</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                >
                  確認して提出する
                </button>
              )}
              <Link href="/" className="block text-xs font-bold text-indigo-600">
                マイ通知へ戻る
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
