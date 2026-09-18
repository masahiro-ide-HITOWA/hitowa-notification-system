"use client";

import { useEffect, useState } from "react";
import { countUnreadNotifications, parseNotificationList } from "@/lib/notifications";

export function useUnreadNotificationCount(portalUserId: string): number {
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

  return unreadCount;
}
