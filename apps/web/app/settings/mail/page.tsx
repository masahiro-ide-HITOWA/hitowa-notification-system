import Header from "@/components/Header";
import { MailConfigForm } from "@/components/MailConfigForm";
import { canUseWebMail, HQ_WEB_MAIL_EXCLUDED_NOTE } from "@/lib/mail-permission";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { portalUserFromRequest } from "@/lib/portal-user-request";
import { redirect } from "next/navigation";

export default async function MailSettingsPage() {
  const user = await portalUserFromRequest();
  if (!user) {
    redirect(SAML_LOGIN_PATH);
  }
  const enabled = canUseWebMail(user.email);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">メール接続設定</h1>
          <p className="text-xs text-slate-500 mt-1">
            IMAP/SMTP のサーバーとポート、アカウント名、パスワードを登録します。未入力時の IMAP は imap.kagoya.net:993（TLS）です。
          </p>
        </div>
        {enabled ? (
          <MailConfigForm portalUserId={user.portalUserId} email={user.email} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">
              {HQ_WEB_MAIL_EXCLUDED_NOTE}
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
