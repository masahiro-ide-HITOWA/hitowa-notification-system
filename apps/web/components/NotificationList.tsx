"use client";

import { useCallback, useEffect, useState } from "react";
import { NotificationListItem } from "@/components/notification-list-item";
import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  parseNotificationFeed,
  type NotificationFilter,
} from "@/lib/notification-query";
import type { NotificationItem } from "@/lib/notifications";

interface NotificationListProps {
  portalUserId: string;
}

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "すべて" },
  { id: "unread", label: "未読のみ" },
  { id: "read", label: "既読のみ" },
];

export function NotificationList({ portalUserId }: NotificationListProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextFilter: NotificationFilter, nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          filter: nextFilter,
          page: String(nextPage),
          limit: String(DEFAULT_NOTIFICATION_PAGE_SIZE),
        });
        const res = await fetch(`/api/notifications?${params.toString()}`, {
          headers: { "x-user-id": portalUserId },
        });
        const parsed = parseNotificationFeed(await res.json());
        if (!res.ok || !parsed) {
          throw new Error("通知一覧の取得に失敗しました");
        }
        setItems(parsed.items);
        setPage(parsed.page);
        setTotalPages(parsed.totalPages);
        setTotal(parsed.total);
        setUnreadCount(parsed.unreadCount);
        setFilter(parsed.filter);
      } catch {
        setError("通知を読み込めませんでした");
      } finally {
        setLoading(false);
      }
    },
    [portalUserId]
  );

  useEffect(() => {
    void load(filter, page);
  }, [filter, load, page]);

  async function handleSelect(item: NotificationItem) {
    if (item.isRead) {
      return;
    }
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": portalUserId,
        },
        body: JSON.stringify({ id: item.id, portalUserId }),
      });
      const data: unknown = await res.json();
      if (
        res.ok &&
        typeof data === "object" &&
        data !== null &&
        "success" in data &&
        data.success === true
      ) {
        await load(filter, page);
      }
    } catch {
      console.error("Failed to mark notification as read");
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center gap-2">
        <h2 className="text-xs font-bold">📬 自分宛ての通知一覧</h2>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            未読 {unreadCount}
          </span>
        )}
      </div>
      <div className="px-4 pt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFilter(tab.id);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              filter === tab.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {loading && <p className="text-xs text-slate-500">通知を読み込んでいます...</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-xs text-slate-500">現在、自分宛ての通知はありません。</p>
        )}
        {!loading &&
          !error &&
          items.map((item) => (
            <NotificationListItem key={item.id} item={item} onSelect={(selected) => void handleSelect(selected)} />
          ))}
        {!loading && !error && total > DEFAULT_NOTIFICATION_PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="text-xs font-bold text-indigo-600 disabled:text-slate-300"
            >
              前へ
            </button>
            <p className="text-[11px] text-slate-500">
              {page} / {totalPages} ページ
            </p>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="text-xs font-bold text-indigo-600 disabled:text-slate-300"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
