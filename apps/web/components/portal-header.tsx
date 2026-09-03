export function PortalHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="border-b border-slate-200 bg-[#0B3A6E] text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs tracking-wide text-white/70">HITOWA HOLDINGS</p>
          <h1 className="text-lg font-semibold sm:text-xl">
            統合通知ポータル
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-white/80 sm:block">
            未読 {unreadCount} 件
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-medium">
            征
          </div>
        </div>
      </div>
    </header>
  );
}
