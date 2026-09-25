"use client";

import { useCallback, useEffect, useState } from "react";
import { isLinkedStatusPayload } from "@/lib/line-link-status-payload";

export { isLinkedStatusPayload };

export async function fetchLineLinkStatus(params: {
  email: string;
  portalUserId: string;
  code?: string;
}): Promise<boolean> {
  const query = new URLSearchParams();
  if (params.code) {
    query.set("code", params.code);
  }
  query.set("email", params.email);
  const res = await fetch(`/api/line/check-status?${query.toString()}`, {
    headers: {
      "x-user-email": params.email,
      "x-user-id": params.portalUserId,
    },
  });
  const data: unknown = await res.json();
  return isLinkedStatusPayload(data);
}

export function useLineLinkStatus(email: string, portalUserId: string): {
  isLinked: boolean;
  setIsLinked: (value: boolean) => void;
  refresh: (code?: string) => Promise<void>;
} {
  const [isLinked, setIsLinked] = useState(false);

  const refresh = useCallback(
    async (code?: string) => {
      try {
        const linked = await fetchLineLinkStatus({ email, portalUserId, code });
        setIsLinked(linked);
      } catch {
        // 既存の画面状態を維持する
      }
    },
    [email, portalUserId]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isLinked, setIsLinked, refresh };
}
