import Link from "next/link";
import {
  FIELD_MAIL_SETTINGS_TITLE,
  HQ_WEB_MAIL_EXCLUDED_NOTE,
  mypageMailSettingsView,
} from "@/lib/mail-permission";

interface MypageMailSettingsCardProps {
  email: string;
}

export function MypageMailSettingsCard({ email }: MypageMailSettingsCardProps) {
  if (mypageMailSettingsView(email) === "excluded") {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <p className="text-sm font-semibold text-amber-800">{HQ_WEB_MAIL_EXCLUDED_NOTE}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 text-white p-3.5 text-xs font-bold">
        {FIELD_MAIL_SETTINGS_TITLE}
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          IMAP/SMTP 接続情報を登録すると、現場メールをポータル上の Web メールから送受信できます。
        </p>
        <Link
          href="/settings/mail"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
        >
          設定を変更する
        </Link>
      </div>
    </div>
  );
}
