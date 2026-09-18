"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HQ_WEB_MAIL_EXCLUDED_NOTE,
  WEB_MAIL_NEEDS_SETTINGS_NOTE,
  resolveWebMailNavMode,
} from "@/lib/mail-permission";
import { formatUnreadBadge } from "@/lib/notifications";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";
import { useMailConfigStatus } from "@/lib/use-mail-config-status";
import { useUnreadNotificationCount } from "@/lib/use-unread-notification-count";

function navClass(active: boolean): string {
  return `px-3 py-1.5 rounded-lg font-semibold transition ${
    active ? "bg-indigo-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
  }`;
}

function DisabledWebMail({ tooltip }: { tooltip: string }) {
  return (
    <span className="relative group">
      <span
        aria-disabled="true"
        title={tooltip}
        className="px-3 py-1.5 rounded-lg font-semibold bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed inline-block"
      >
        Webメール
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-700 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-white shadow-lg group-hover:block"
      >
        {tooltip}
      </span>
    </span>
  );
}

function WebMailNavButton({ pathname }: { pathname: string }) {
  const status = useMailConfigStatus(DEMO_USER_PROFILE.portalUserId, DEMO_USER_PROFILE.email);
  const mode = resolveWebMailNavMode(DEMO_USER_PROFILE.email, status.username, status.hasPassword);

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
          className="px-3 py-1.5 rounded-lg font-semibold bg-slate-800 text-slate-400 opacity-50 inline-block"
        >
          Webメール
        </Link>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-700 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-white shadow-lg group-hover:block"
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
  const unreadCount = useUnreadNotificationCount(DEMO_USER_PROFILE.portalUserId);
  const unreadBadge = formatUnreadBadge(unreadCount);

  return (
    <header className="bg-slate-900 text-white p-3 sticky top-0 z-40 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-indigo-400">
          <span className="text-lg">🔔</span>
          <Link href="/" className="hover:text-indigo-300 transition">
            <span className="hidden sm:inline">HITOWA統合通知ポータル</span>
            <span className="sm:hidden text-sm">HITOWAポータル</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <Link
            href="/notifications"
            className={`${navClass(pathname === "/notifications")} inline-flex items-center gap-1.5`}
          >
            マイ通知
            {unreadBadge ? (
              <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                {unreadBadge}
              </span>
            ) : null}
          </Link>
          <WebMailNavButton pathname={pathname} />
          <Link href="/mypage" className={navClass(pathname === "/mypage")}>
            設定
          </Link>
        </nav>
      </div>
    </header>
  );
}
