import Header from "@/components/Header";
import { MailConfigForm } from "@/components/MailConfigForm";
import { canUseWebMail } from "@/lib/mail-permission";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

export default function MailSettingsPage() {
  const user = DEMO_USER_PROFILE;
  const enabled = canUseWebMail(user.email);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">メール接続設定</h1>
          <p className="text-xs text-slate-500 mt-1">
            KAGOYA 等の現場メールを Web メーラーで利用するための IMAP/SMTP 接続情報です。
          </p>
        </div>
        {enabled ? (
          <MailConfigForm portalUserId={user.portalUserId} email={user.email} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">
              ※本部社員はWebメール機能の対象外です
            </p>
            <p className="text-xs text-amber-700 mt-1">
              現在のアカウント（{user.email}）ではメール接続設定を利用できません。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
