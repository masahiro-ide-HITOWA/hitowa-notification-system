import { CATEGORY_LABEL } from "@/lib/mock-notifications";
import type { PortalNotification } from "@/lib/notification-types";

import { SourceBadge } from "./source-badge";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function NotificationCard({
  notification,
}: {
  notification: PortalNotification;
}) {
  return (
    <article
      className={`rounded-xl border bg-white p-4 sm:p-5 ${
        notification.is_read
          ? "border-slate-200"
          : "border-[#1F8A9D]/40 ring-1 ring-[#1F8A9D]/20"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={notification.source_system} />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {CATEGORY_LABEL[notification.category]}
        </span>
        {!notification.is_read ? (
          <span className="text-xs font-semibold text-[#1F8A9D]">未読</span>
        ) : null}
        <time
          className="ml-auto text-xs text-slate-400"
          dateTime={notification.created_at}
        >
          {formatDate(notification.created_at)}
        </time>
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">
        {notification.title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
      <div className="mt-4">
        <a
          href={notification.action_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-[#1F8A9D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#187887]"
        >
          ダイレクトジャンプ
        </a>
      </div>
    </article>
  );
}
