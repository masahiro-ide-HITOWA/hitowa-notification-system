import { QRCodeSVG } from "qrcode.react";

interface PendingCodeData {
  oneTimeCode: string;
  expiresAt: string;
  lineAddFriendUrl: string;
}

interface MypagePendingCodePanelProps {
  codeData: PendingCodeData;
  isCopied: boolean;
  onCopy: () => void;
}

export function MypagePendingCodePanel({
  codeData,
  isCopied,
  onCopy,
}: MypagePendingCodePanelProps) {
  return (
    <div className="space-y-3 w-full max-w-xs">
      <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold animate-pulse inline-block">
        🔄 LINEからの送信を待っています...
      </div>
      <div className="bg-white px-5 py-2.5 rounded-xl border-2 border-indigo-600 shadow-inner flex items-center justify-between">
        <span className="font-mono font-extrabold text-2xl tracking-[0.2em] text-indigo-900">
          {codeData.oneTimeCode}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition"
        >
          {isCopied ? "コピー完了!" : "コピー"}
        </button>
      </div>
      <p className="text-[11px] text-amber-700 font-semibold">
        ⏳ 有効期限: {new Date(codeData.expiresAt).toLocaleTimeString()} まで
      </p>
      <a
        href={codeData.lineAddFriendUrl || "https://line.me/ti/p/"}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-lg text-xs transition shadow-sm block text-center"
      >
        💬 公式LINEを開いてコードを送信する ↗
      </a>
      {codeData.lineAddFriendUrl && (
        <div className="pt-2 flex flex-col items-center">
          <QRCodeSVG value={codeData.lineAddFriendUrl} size={120} />
          <span className="text-[10px] text-slate-400 mt-1">QRコードから友達追加</span>
        </div>
      )}
    </div>
  );
}
