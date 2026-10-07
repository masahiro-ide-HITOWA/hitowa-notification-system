"use client";

import { useEffect, useState } from "react";
import { readApiJson, type MailConfigApiBody } from "@/lib/mail-config-client";

export function useMailConfigStatus(
  portalUserId: string,
  email: string
): { username: string; hasPassword: boolean } {
  const [status, setStatus] = useState({ username: "", hasPassword: false });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/mail/config", {
          headers: { "x-user-id": portalUserId, "x-user-email": email },
        });
        const data = await readApiJson<MailConfigApiBody>(res);
        if (!cancelled && res.ok && data.success && data.config) {
          setStatus({
            username: data.config.username,
            hasPassword: data.config.hasPassword,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({ username: "", hasPassword: false });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [portalUserId, email]);

  return status;
}
