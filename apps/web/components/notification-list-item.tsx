import type { NotificationItem, NotificationSystemName } from "@/lib/notifications";

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

interface NotificationListItemProps {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}

export function NotificationListItem({ item, onSelect }: NotificationListItemProps) {
  return (
    <article
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
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
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${SYSTEM_BADGE_CLASS[item.systemName]}`}>
          {item.systemName}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            item.isRead ? "bg-slate-100 text-slate-500" : "bg-rose-500 text-white"
          }`}
        >
          {item.isRead ? "既読" : "未読"}
        </span>
        <time className="ml-auto text-[10px] text-slate-400">{formatNotificationTime(item.createdAt)}</time>
      </div>
      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
      {item.actionUrl && (
        <a
          href={item.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          該当SaaSを開く ➔
        </a>
      )}
    </article>
  );
}
