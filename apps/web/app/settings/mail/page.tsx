import Header from "@/components/Header";
import { MailConfigForm } from "@/components/MailConfigForm";
import { SESSION_COOKIE_NAME, resolvePortalUser } from "@/lib/auth-session";
import { canUseWebMail, HQ_WEB_MAIL_EXCLUDED_NOTE } from "@/lib/mail-permission";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function MailSettingsPage() {
  const user = resolvePortalUser((await cookies()).get(SESSION_COOKIE_NAME)?.value);
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
            IMAP/SMTP の接続先はサーバー側で固定です。アカウント名とパスワードのみ登録してください。
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
