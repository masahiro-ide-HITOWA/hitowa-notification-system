import Header from "@/components/Header";
import { NotificationList } from "@/components/NotificationList";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { portalUserFromRequest } from "@/lib/portal-user-request";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const user = await portalUserFromRequest();
  if (!user) {
    redirect(SAML_LOGIN_PATH);
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">マイ通知</h1>
          <p className="text-xs text-slate-500 mt-1">
            カオナビ・TOKIUM・クラウドハウス労務・全社ポータルから届いた、自分宛ての通知履歴です。
          </p>
        </div>
        <NotificationList portalUserId={user.portalUserId} />
      </main>
    </div>
  );
}
