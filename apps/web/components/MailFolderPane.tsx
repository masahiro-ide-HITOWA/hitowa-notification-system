import { MAIL_FOLDERS } from "@/lib/mail-imap-model";

interface MailFolderPaneProps {
  selected: string;
  onSelect: (folder: string) => void;
  onCompose?: () => void;
}

export function MailFolderPane({ selected, onSelect, onCompose }: MailFolderPaneProps) {
  return (
    <nav className="p-2 space-y-1 bg-slate-50 h-full">
      {onCompose ? (
        <button
          type="button"
          onClick={onCompose}
          className="w-full mb-2 px-2.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
        >
          新規作成
        </button>
      ) : null}
      <p className="px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wide">フォルダ</p>
      {MAIL_FOLDERS.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onSelect(folder.id)}
          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold ${
            selected === folder.id
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          {folder.label}
        </button>
      ))}
    </nav>
  );
}
