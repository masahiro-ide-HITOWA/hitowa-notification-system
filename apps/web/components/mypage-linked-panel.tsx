interface MypageLinkedPanelProps {
  unlinking: boolean;
  onUnlink: () => void;
}

export function MypageLinkedPanel({ unlinking, onUnlink }: MypageLinkedPanelProps) {
  return (
    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center w-full max-w-xs space-y-3">
      <div className="space-y-1">
        <div className="text-2xl">✅</div>
        <h3 className="font-bold text-emerald-800 text-sm">連携が完了しました！</h3>
        <p className="text-emerald-600 text-[11px]">ポータルからの通知がLINEに配信されます。</p>
      </div>
      <button
        type="button"
        onClick={onUnlink}
        disabled={unlinking}
        className="w-full px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 font-bold rounded-lg text-xs border border-rose-200 transition disabled:opacity-50"
      >
        {unlinking ? "解除中..." : "LINE連携を解除"}
      </button>
    </div>
  );
}
