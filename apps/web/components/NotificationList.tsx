"use client";

import { useEffect, useState } from "react";
import {
  countUnreadNotifications,
  parseNotificationList,
  type NotificationItem,
  type NotificationSystemName,
} from "@/lib/notifications";
import { markItemsAsRead } from "@/lib/notification-read";

interface NotificationListProps {
  portalUserId: string;
}

const SYSTEM_BADGE_CLASS: Record<NotificationSystemName, string> = {
  カオナビ: "bg-blue-600 text-white",
  TOKIUM: "bg-orange-500 text-white",
  クラウドハウス労務: "bg-emerald-600 text-white",
  全社ポータル: "bg-indigo-600 text-white",
};

function formatNotificationTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationList({ portalUserId }: NotificationListProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notifications", {
          headers: { "x-user-id": portalUserId },
        });
        const data: unknown = await res.json();
        const parsed = parseNotificationList(data);
        if (!res.ok || !parsed) {
          throw new Error("通知一覧の取得に失敗しました");
        }
        if (!cancelled) {
          setItems(parsed);
        }
      } catch {
        if (!cancelled) {
          setError("通知を読み込めませんでした");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [portalUserId]);

  const unreadCount = countUnreadNotifications(items);

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
        setItems((current) => markItemsAsRead(current, item.id));
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

      <div className="p-4 space-y-3">
        {loading && <p className="text-xs text-slate-500">通知を読み込んでいます...</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-xs text-slate-500">現在、自分宛ての通知はありません。</p>
        )}
        {!loading &&
          !error &&
          items.map((item) => (
            <article
              key={item.id}
              onClick={() => {
                void handleSelect(item);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleSelect(item);
                }
              }}
              role="button"
              tabIndex={0}
              className={`rounded-xl border p-3.5 space-y-1.5 text-left ${
                item.isRead
                  ? "bg-white border-slate-200"
                  : "bg-indigo-50/80 border-indigo-200 shadow-sm cursor-pointer hover:border-indigo-300"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${SYSTEM_BADGE_CLASS[item.systemName]}`}
                >
                  {item.systemName}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.isRead
                      ? "bg-slate-100 text-slate-500"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {item.isRead ? "既読" : "未読"}
                </span>
                <time className="ml-auto text-[10px] text-slate-400">
                  {formatNotificationTime(item.createdAt)}
                </time>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
            </article>
          ))}
      </div>
    </section>
  );
}
