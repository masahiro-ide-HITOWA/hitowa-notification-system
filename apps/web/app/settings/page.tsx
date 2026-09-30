import Header from "@/components/Header";
import { MypageClient } from "@/components/MypageClient";
import { SESSION_COOKIE_NAME, resolvePortalUser } from "@/lib/auth-session";
import { SAML_LOGIN_PATH } from "@/lib/auth-mode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = resolvePortalUser((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!user) {
    redirect(SAML_LOGIN_PATH);
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <Header />
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-5">
        <MypageClient userProfile={user} />
      </main>
    </div>
  );
}
