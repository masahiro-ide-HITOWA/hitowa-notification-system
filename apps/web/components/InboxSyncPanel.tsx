"use client";

import { useState } from "react";

interface SyncError {
  message: string;
  detail?: string;
  recipientEmail?: string;
}

interface SyncResult {
  connection: "ok" | "failed";
  unreadCount: number | null;
  fetched: number;
  ingested: number;
  message: string;
  errors: SyncError[];
}

function readSyncResult(value: unknown): SyncResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const connection = record.connection === "failed" ? "failed" : record.connection === "ok" ? "ok" : null;
  if (!connection || typeof record.message !== "string") {
    return null;
  }
  const errors = Array.isArray(record.errors)
    ? record.errors.flatMap((item) => {
        if (typeof item !== "object" || item === null || !("message" in item)) {
          return [];
        }
        const error = item as Record<string, unknown>;
        if (typeof error.message !== "string") {
          return [];
        }
        return [
          {
            message: error.message,
            detail: typeof error.detail === "string" ? error.detail : undefined,
            recipientEmail: typeof error.recipientEmail === "string" ? error.recipientEmail : undefined,
          },
        ];
      })
    : [];
  return {
    connection,
    unreadCount: typeof record.unreadCount === "number" ? record.unreadCount : null,
    fetched: typeof record.fetched === "number" ? record.fetched : 0,
    ingested: typeof record.ingested === "number" ? record.ingested : 0,
    message: record.message,
    errors,
  };
}

export function InboxSyncPanel({ onSynced }: { onSynced: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function syncInbox() {
    setRunning(true);
    setFailure(null);
    try {
      const response = await fetch("/api/cron/fetch-emails", { cache: "no-store" });
      const body: unknown = await response.json();
      const parsed = readSyncResult(body);
      if (!parsed) {
        setResult(null);
        setFailure("同期結果を読み取れませんでした");
        return;
      }
      setResult(parsed);
      if (parsed.connection === "ok") {
        onSynced();
      }
    } catch (error) {
      setResult(null);
      setFailure(error instanceof Error ? error.message : "同期リクエストに失敗しました");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-slate-900">受信メールの同期</h2>
          <p className="text-[11px] text-slate-500 mt-1">
            共有受信箱へ IMAP 接続し、未読件数と取り込みエラーを表示します。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncInbox()}
          disabled={running}
          className="shrink-0 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-2 disabled:opacity-60"
        >
          {running ? "同期中..." : "今すぐ同期"}
        </button>
      </div>
      {failure ? <p className="text-xs text-rose-600">{failure}</p> : null}
      {result ? (
        <div className="text-xs text-slate-700 space-y-1">
          <p>
            接続: {result.connection === "ok" ? "成功" : "失敗"} / 取得した未読:{" "}
            {result.unreadCount ?? "不明"} 通 / 取得 {result.fetched} 通 / 保存 {result.ingested} 件
          </p>
          <p>{result.message}</p>
          {result.errors.map((error, index) => (
            <p key={`${error.message}-${index}`} className="text-rose-700">
              {error.recipientEmail ? `${error.recipientEmail}: ` : ""}
              {error.message}
              {error.detail ? ` (${error.detail})` : ""}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
