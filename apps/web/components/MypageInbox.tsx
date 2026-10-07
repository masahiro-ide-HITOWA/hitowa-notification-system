"use client";

import { useState } from "react";
import { InboxSyncPanel } from "@/components/InboxSyncPanel";
import { NotificationList } from "@/components/NotificationList";

export function MypageInbox({ portalUserId }: { portalUserId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <InboxSyncPanel onSynced={() => setRefreshKey((current) => current + 1)} />
      <NotificationList key={refreshKey} portalUserId={portalUserId} />
    </>
  );
}
