import type { MailDetail } from "@/lib/mail-imap-model";

interface MailPreviewPaneProps {
  detail: MailDetail | null;
  loading: boolean;
}

function formatDetailDate(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MailPreviewPane({ detail, loading }: MailPreviewPaneProps) {
  if (loading) {
    return <p className="p-4 text-xs text-slate-500">本文を読み込んでいます...</p>;
  }
  if (!detail) {
    return <p className="p-4 text-sm text-slate-500">メールを選択してください</p>;
  }

  return (
    <div className="p-4 text-xs space-y-3 h-full overflow-y-auto">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-900">{detail.subject}</h2>
        <p className="text-[11px] text-slate-500 mt-1">差出人: {detail.from}</p>
        <p className="text-[11px] text-slate-500">宛先: {detail.to || "-"}</p>
        <p className="text-[11px] text-slate-500">送信日時: {formatDetailDate(detail.date)}</p>
      </div>
      {detail.html ? (
        <iframe
          title="メール本文"
          sandbox=""
          srcDoc={detail.html}
          className="w-full min-h-[280px] border border-slate-100 rounded bg-white"
        />
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
          {detail.text || "(本文なし)"}
        </pre>
      )}
    </div>
  );
}
