import Header from "@/components/Header";
import { NotificationList } from "@/components/NotificationList";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

export default function NotificationsPage() {
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
        <NotificationList portalUserId={DEMO_USER_PROFILE.portalUserId} />
      </main>
    </div>
  );
}
