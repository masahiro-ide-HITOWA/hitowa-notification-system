"use client";

import { useState, type FormEvent } from "react";
import type { SendMailMode } from "@/lib/mail-smtp-model";
import { MISSING_TO_MESSAGE } from "@/lib/mail-smtp-model";

export interface ComposeDraft {
  mode: SendMailMode;
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyToUid?: number;
}

interface MailComposeModalProps {
  draft: ComposeDraft;
  portalUserId: string;
  email: string;
  displayName: string;
  onClose: () => void;
  onSent: (message: string) => void;
}

const MODE_LABEL: Record<SendMailMode, string> = {
  new: "新規作成",
  reply: "返信",
  forward: "転送",
};

export function MailComposeModal({
  draft,
  portalUserId,
  email,
  displayName,
  onClose,
  onSent,
}: MailComposeModalProps) {
  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none";
  const canSend = to.trim() !== "" && subject.trim() !== "" && body.trim() !== "" && !sending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTo = to.trim();
    if (!trimmedTo) {
      setError(MISSING_TO_MESSAGE);
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": portalUserId,
          "x-user-email": email,
        },
        body: JSON.stringify({
          portalUserId,
          email,
          fromName: displayName,
          fromEmail: email,
          to: trimmedTo,
          cc: cc.trim() || undefined,
          bcc: undefined,
          subject: subject.trim(),
          body,
          mode: draft.mode,
          replyToUid: draft.replyToUid,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "送信に失敗しました");
      }
      onSent(data.message || "メールを送信しました");
      onClose();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{MODE_LABEL[draft.mode]}</h2>
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
            閉じる
          </button>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          宛先
          <input className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          CC
          <input className={fieldClass} value={cc} onChange={(e) => setCc(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          件名
          <input className={fieldClass} value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          本文
          <textarea
            className={`${fieldClass} min-h-[160px]`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-600">
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!canSend}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}
