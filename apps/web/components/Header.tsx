'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 text-white p-3 sticky top-0 z-40 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-indigo-400">
          <span class="text-lg">🔔</span>
          <Link href="/" className="hover:text-indigo-300 transition">
            <span className="hidden sm:inline">HITOWA統合通知ポータル</span>
            <span className="sm:hidden text-sm">HITOWAポータル</span>
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              pathname === '/'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            マイ通知
          </Link>
          <Link
            href="/mail"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              pathname === '/mail'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Webメール
          </Link>
          <Link
            href="/mypage"
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              pathname === '/mypage'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            設定
          </Link>
        </nav>
      </div>
    </header>
  );
}