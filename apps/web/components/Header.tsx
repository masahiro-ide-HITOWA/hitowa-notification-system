"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HQ_WEB_MAIL_EXCLUDED_NOTE,
  WEB_MAIL_NEEDS_SETTINGS_NOTE,
  resolveWebMailNavMode,
} from "@/lib/mail-permission";
import { formatUnreadBadge } from "@/lib/notifications";
import { useMailConfigStatus } from "@/lib/use-mail-config-status";
import { usePortalUser } from "@/lib/use-portal-user";
import { useUnreadNotificationCount } from "@/lib/use-unread-notification-count";

function navClass(active: boolean): string {
  return `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
    active
      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
  }`;
}

function DisabledWebMail({ tooltip }: { tooltip: string }) {
  return (
    <span className="relative group">
      <span
        aria-disabled="true"
        title={tooltip}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/50 text-slate-500 opacity-60 cursor-not-allowed inline-block"
      >
        Webメール
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] font-medium leading-relaxed text-slate-200 shadow-xl group-hover:block"
      >
        {tooltip}
      </span>
    </span>
  );
}

function WebMailNavButton({
  pathname,
  portalUserId,
  email,
}: {
  pathname: string;
  portalUserId: string;
  email: string;
}) {
  const status = useMailConfigStatus(portalUserId, email);
  const mode = resolveWebMailNavMode(email, status.username, status.hasPassword);

  if (mode === "enabled") {
    return (
      <Link href="/mail" className={navClass(pathname === "/mail")}>
        Webメール
      </Link>
    );
  }

  if (mode === "needs-settings") {
    return (
      <span className="relative group">
        <Link
          href="/settings/mail"
          title={WEB_MAIL_NEEDS_SETTINGS_NOTE}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 inline-block transition-colors"
        >
          Webメール
        </Link>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-[10px] font-medium leading-relaxed text-slate-200 shadow-xl group-hover:block"
        >
          {WEB_MAIL_NEEDS_SETTINGS_NOTE}
        </span>
      </span>
    );
  }

  return <DisabledWebMail tooltip={HQ_WEB_MAIL_EXCLUDED_NOTE} />;
}

export default function Header() {
  const pathname = usePathname();
  const { user, authMode } = usePortalUser();
  const unreadCount = useUnreadNotificationCount(user?.portalUserId ?? "");
  const unreadBadge = formatUnreadBadge(unreadCount);

  // 環境変数からポータルURLを取得
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_ORIGIN || process.env.PORTAL_ORIGIN || "https://portal.hitowa.com";

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-white p-3 sticky top-0 z-40 shadow-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* 左側：ロゴ & サイト名 */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <span className="text-sm">🔔</span>
          </div>
          <Link href="/mypage" className="hover:text-indigo-300 transition">
            <span className="hidden sm:inline font-bold text-sm tracking-wide text-slate-100">
              HITOWA<span className="text-indigo-400 font-normal ml-1">統合通知ポータル</span>
            </span>
            <span className="sm:hidden text-xs font-bold text-indigo-400">統合通知</span>
          </Link>
        </div>

        {/* 右側：ナビゲーション */}
        <nav className="flex items-center gap-2 text-xs">
          {/* マイ通知 */}
          <Link
            href="/mypage"
            className={`${navClass(pathname === "/mypage" || pathname === "/notifications")} inline-flex items-center gap-1.5`}
          >
            マイ通知
            {unreadBadge ? (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold animate-pulse">
                {unreadBadge}
              </span>
            ) : null}
          </Link>

          {/* Webメール */}
          {user ? (
            <WebMailNavButton
              pathname={pathname}
              portalUserId={user.portalUserId}
              email={user.email}
            />
          ) : null}

          {/* 設定 */}
          <Link href="/settings" className={navClass(pathname === "/settings" || pathname.startsWith("/settings/"))}>
            設定
          </Link>

          {/* HITOWAポータル（「設定」と「ログアウト」の間へ配置・グリッドアイコン化） */}
          <a
            href={portalUrl}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/50 transition-all duration-200 flex items-center gap-1.5"
            title="HITOWAポータルへ移動"
          >
            <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>HITOWAポータル</span>
          </a>

          {/* ログアウト / ログイン（一番右端） */}
          {authMode === "saml" && !user ? (
            <Link href="/api/auth/saml/login" className={navClass(false)}>
              ログイン
            </Link>
          ) : (
            <a
              href="/api/auth/logout"
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 ml-1"
              title="ログアウト"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>ログアウト</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}