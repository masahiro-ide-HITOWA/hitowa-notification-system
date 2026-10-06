import Header from "@/components/Header";
import { MailClient } from "@/components/MailClient";
import { canUseWebMail } from "@/lib/mail-permission";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { portalUserFromRequest } from "@/lib/portal-user-request";
import { redirect } from "next/navigation";

export default async function MailPage() {
  const user = await portalUserFromRequest();
  if (!user) {
    redirect(SAML_LOGIN_PATH);
  }
  const enabled = canUseWebMail(user.email);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-6xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Webメール</h1>
          <p className="text-xs text-slate-500 mt-1">KAGOYA 等の現場メールを IMAP で閲覧します。</p>
        </div>
        {enabled ? (
          <MailClient
            portalUserId={user.portalUserId}
            email={user.email}
            displayName={user.name}
          />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">※本部社員はWebメール機能の対象外です</p>
          </div>
        )}
      </main>
    </div>
  );
}
