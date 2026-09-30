"use client";

import { useEffect, useState } from "react";
import { DEMO_USER_PROFILE, type PortalUserProfile } from "@/lib/saml-user-attributes";

export type AuthMode = "mock" | "saml";

export function usePortalUser(): {
  user: PortalUserProfile | null;
  authMode: AuthMode;
} {
  const [user, setUser] = useState<PortalUserProfile | null>(DEMO_USER_PROFILE);
  const [authMode, setAuthMode] = useState<AuthMode>("mock");

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (res) => {
        const data: unknown = await res.json();
        if (typeof data !== "object" || data === null) {
          return;
        }
        const payload = data as {
          authMode?: string;
          user?: PortalUserProfile | null;
        };
        if (payload.authMode === "saml" || payload.authMode === "mock") {
          setAuthMode(payload.authMode);
        }
        setUser(payload.user ?? null);
      })
      .catch(() => {
        // keep the last known user
      });
  }, []);

  return { user, authMode };
}
