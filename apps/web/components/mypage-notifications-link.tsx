"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  countUnreadNotifications,
  parseNotificationList,
} from "@/lib/notifications";

interface MypageNotificationsLinkProps {
  portalUserId: string;
}

export function MypageNotificationsLink({ portalUserId }: MypageNotificationsLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "x-user-id": portalUserId },
        });
        const parsed = parseNotificationList(await res.json());
        if (!cancelled && parsed) {
          setUnreadCount(countUnreadNotifications(parsed));
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnread();
    return () => {
      cancelled = true;
    };
  }, [portalUserId]);

  return (
    <Link
      href="/notifications"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 transition text-xs font-bold text-slate-800"
    >
      🔔 マイ通知一覧を見る
      {unreadCount > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
          未読 {unreadCount}
        </span>
      )}
    </Link>
  );
}
