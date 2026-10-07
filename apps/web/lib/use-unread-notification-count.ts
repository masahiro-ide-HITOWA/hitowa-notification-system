"use client";

import { useEffect, useSyncExternalStore } from "react";
import { parseNotificationFeed } from "@/lib/notification-query";

type Listener = () => void;

let unreadCount = 0;
let generation = 0;
const listeners = new Set<Listener>();

function emitUnreadCount(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeUnreadNotificationCount(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUnreadNotificationCount(): number {
  return unreadCount;
}

export function beginUnreadCountLoad(): number {
  generation += 1;
  return generation;
}

export function replaceUnreadNotificationCount(count: number, requestGeneration: number): void {
  if (requestGeneration !== generation) {
    return;
  }
  unreadCount = Math.max(0, count);
  emitUnreadCount();
}

export function decrementUnreadNotificationCount(): void {
  generation += 1;
  unreadCount = Math.max(0, unreadCount - 1);
  emitUnreadCount();
}

export function useUnreadNotificationCount(portalUserId: string): number {
  const count = useSyncExternalStore(
    subscribeUnreadNotificationCount,
    getUnreadNotificationCount,
    () => 0
  );

  useEffect(() => {
    let cancelled = false;
    const requestGeneration = beginUnreadCountLoad();
    if (portalUserId.trim() === "") {
      replaceUnreadNotificationCount(0, requestGeneration);
      return;
    }

    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "x-user-id": portalUserId },
        });
        const parsed = parseNotificationFeed(await res.json());
        if (!cancelled) {
          replaceUnreadNotificationCount(parsed?.unreadCount ?? 0, requestGeneration);
        }
      } catch {
        if (!cancelled) {
          replaceUnreadNotificationCount(0, requestGeneration);
        }
      }
    }

    void loadUnread();
    return () => {
      cancelled = true;
    };
  }, [portalUserId]);

  return count;
}
