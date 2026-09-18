"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MailComposeModal, type ComposeDraft } from "@/components/MailComposeModal";
import { MailFolderPane } from "@/components/MailFolderPane";
import { MailListPane } from "@/components/MailListPane";
import { MailPreviewPane } from "@/components/MailPreviewPane";
import { CONFIG_MISSING_MESSAGE, type MailDetail, type MailListItem } from "@/lib/mail-imap-model";
import { extractEmailAddress, quotedForwardBody, withSubjectPrefix } from "@/lib/mail-smtp-model";

interface MailClientProps {
  portalUserId: string;
  email: string;
}

export function MailClient({ portalUserId, email }: MailClientProps) {
  const [folder, setFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [configMissing, setConfigMissing] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [toast, setToast] = useState("");

  const headers = useCallback(
    () => ({
      "x-user-id": portalUserId,
      "x-user-email": email,
    }),
    [portalUserId, email]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadList() {
      setListLoading(true);
      setError("");
      setConfigMissing(false);
      setSelectedUid(null);
      setDetail(null);
      try {
        const res = await fetch(`/api/mail/messages?folder=${encodeURIComponent(folder)}&limit=20`, {
          headers: headers(),
        });
        const data = (await res.json()) as {
          success?: boolean;
          messages?: MailListItem[];
          code?: string;
          message?: string;
        };
        if (res.status === 404 && data.code === "CONFIG_MISSING") {
          if (!cancelled) {
            setConfigMissing(true);
            setMessages([]);
          }
          return;
        }
        if (!res.ok || !data.success) {
          throw new Error(data.message || "メール一覧の取得に失敗しました");
        }
        if (!cancelled) {
          setMessages(data.messages ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "メール一覧の取得に失敗しました");
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }
    void loadList();
    return () => {
      cancelled = true;
    };
  }, [folder, headers]);

  useEffect(() => {
    if (selectedUid === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/mail/messages/${selectedUid}?folder=${encodeURIComponent(folder)}`,
          { headers: headers() }
        );
        const data = (await res.json()) as { success?: boolean; message?: MailDetail | string };
        if (!res.ok || !data.success || typeof data.message === "string" || !data.message) {
          throw new Error(typeof data.message === "string" ? data.message : "本文の取得に失敗しました");
        }
        if (!cancelled) {
          setDetail(data.message);
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedUid, folder, headers]);

  if (configMissing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm">
        <p className="text-slate-700">{CONFIG_MISSING_MESSAGE}</p>
        <Link href="/settings/mail" className="inline-block mt-3 text-indigo-600 font-semibold hover:underline">
          メール接続設定へ
        </Link>
      </div>
    );
  }

  const openReply = (item: MailDetail) => {
    setDraft({
      mode: "reply",
      to: extractEmailAddress(item.from),
      cc: "",
      subject: withSubjectPrefix(item.subject, "Re:"),
      body: "",
      replyToUid: item.uid,
    });
  };

  const openForward = (item: MailDetail) => {
    setDraft({
      mode: "forward",
      to: "",
      cc: "",
      subject: withSubjectPrefix(item.subject, "Fwd:"),
      body: quotedForwardBody(item),
      replyToUid: item.uid,
    });
  };

  const handleSent = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {toast ? <p className="px-3 py-2 text-xs text-emerald-800 bg-emerald-50 font-semibold">{toast}</p> : null}
      {error ? <p className="px-3 py-2 text-xs text-rose-600 bg-rose-50">{error}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-[20%_35%_45%] min-h-[520px] divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <MailFolderPane
          selected={folder}
          onSelect={setFolder}
          onCompose={() => setDraft({ mode: "new", to: "", cc: "", subject: "", body: "" })}
        />
        <MailListPane
          messages={messages}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          loading={listLoading}
        />
        <MailPreviewPane
          detail={detail}
          loading={detailLoading}
          onReply={openReply}
          onForward={openForward}
        />
      </div>
      {draft ? (
        <MailComposeModal
          draft={draft}
          portalUserId={portalUserId}
          email={email}
          onClose={() => setDraft(null)}
          onSent={handleSent}
        />
      ) : null}
    </div>
  );
}
