import type { MailListItem } from "@/lib/mail-imap-model";

interface MailListPaneProps {
  messages: MailListItem[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  loading: boolean;
}

function formatListDate(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MailListPane({ messages, selectedUid, onSelect, loading }: MailListPaneProps) {
  if (loading) {
    return <p className="p-3 text-xs text-slate-500">メールを読み込んでいます...</p>;
  }
  if (messages.length === 0) {
    return <p className="p-3 text-xs text-slate-500">このフォルダにメールはありません。</p>;
  }

  return (
    <div className="divide-y divide-slate-100 overflow-y-auto h-full">
      {messages.map((mail) => {
        const active = selectedUid === mail.uid;
        return (
          <button
            key={mail.uid}
            type="button"
            onClick={() => onSelect(mail.uid)}
            className={`w-full text-left p-3 text-xs transition ${
              active ? "bg-sky-50 border-l-4 border-l-sky-500" : "hover:bg-slate-50 border-l-4 border-l-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              {!mail.isRead ? <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" aria-label="未読" /> : null}
              <span className={`truncate ${mail.isRead ? "text-slate-600" : "font-bold text-slate-900"}`}>
                {mail.from}
              </span>
            </div>
            <div className={`truncate mt-0.5 ${mail.isRead ? "text-slate-500" : "font-semibold text-slate-800"}`}>
              {mail.subject}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{formatListDate(mail.date)}</div>
          </button>
        );
      })}
    </div>
  );
}
