import { SAML_LOGIN_PATH } from "@/lib/auth-mode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ logged_out?: string }>;
}) {
  const params = await searchParams;
  const loggedOut = params.logged_out === "true";

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans text-slate-800">
      <main className="max-w-md mx-auto w-full flex-1 p-6 flex flex-col justify-center gap-4">
        <h1 className="text-lg font-bold text-slate-900">HITOWA統合通知ポータル</h1>
        <p className="text-sm text-slate-600">
          {loggedOut
            ? "ログアウトしました。ブラウザのセッションを終了しています。"
            : "ログインするとマイ通知を表示します。"}
        </p>
        <a
          href={SAML_LOGIN_PATH}
          className="inline-flex justify-center rounded-lg bg-slate-900 text-white text-sm font-semibold px-4 py-2"
        >
          ログイン
        </a>
      </main>
    </div>
  );
}
