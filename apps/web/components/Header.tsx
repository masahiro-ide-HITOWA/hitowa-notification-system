"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canUseWebMail } from "@/lib/mail-permission";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

function navClass(active: boolean): string {
  return `px-3 py-1.5 rounded-lg font-semibold transition ${
    active ? "bg-indigo-600 text-white shadow" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
  }`;
}

function WebMailNavButton({ pathname }: { pathname: string }) {
  const enabled = canUseWebMail(DEMO_USER_PROFILE.email);

  if (enabled) {
    return (
      <Link href="/mail" className={navClass(pathname === "/mail")}>
        Webメール
      </Link>
    );
  }

  return (
    <span className="relative group">
      <span
        aria-disabled="true"
        title="※本部社員（@hitowa.com）はWebメール機能の対象外です"
        className="px-3 py-1.5 rounded-lg font-semibold bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed inline-block"
      >
        Webメール
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-700 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-white shadow-lg group-hover:block"
      >
        ※本部社員（@hitowa.com）はWebメール機能の対象外です
      </span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();

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
          <Link href="/notifications" className={navClass(pathname === "/notifications")}>
            マイ通知
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
