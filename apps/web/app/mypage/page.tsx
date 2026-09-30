import Header from "@/components/Header";
import { MypageClient } from "@/components/MypageClient";
import { SaasInboxList } from "@/components/SaasInboxList";
import { SESSION_COOKIE_NAME, resolvePortalUser } from "@/lib/auth-session";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const user = resolvePortalUser((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!user) {
    redirect(SAML_LOGIN_PATH);
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">マイ通知</h1>
          <p className="text-xs text-slate-500 mt-1">
            カオナビ・TOKIUM・クラウドハウス労務から届いた通知を、SaaSごとに絞り込めます。
          </p>
        </div>
        <SaasInboxList />
        <MypageClient userProfile={user} />
      </main>
    </div>
  );
}
