import Header from "@/components/Header";
import { NotificationList } from "@/components/NotificationList";
import { hostnameFromHeaders, isMockAuthEnabled, SAML_LOGIN_PATH, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { logAuthGuardCookies, resolveGuardedPortalUser } from "@/lib/auth-guard";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MyPage() {
  const jar = await cookies();
  const hostname = hostnameFromHeaders(await headers());
  logAuthGuardCookies(jar.getAll());
  console.log("[AUTH GUARD CHECK] mock=", isMockAuthEnabled(process.env, hostname));
  const user = resolveGuardedPortalUser(jar.get(SESSION_COOKIE_NAME)?.value, hostname);
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
