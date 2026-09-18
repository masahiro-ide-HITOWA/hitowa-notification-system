"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_MAIL_HOSTS, PASSWORD_MASK, type MailConfigPublic } from "@/lib/mail-config";

interface MailConfigFormProps {
  portalUserId: string;
  email: string;
}

interface FormState {
  imapHost: string;
  imapPort: string;
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
}

function toFormState(config: MailConfigPublic | null): FormState {
  return {
    imapHost: config?.imapHost || DEFAULT_MAIL_HOSTS.imapHost,
    imapPort: String(config?.imapPort || DEFAULT_MAIL_HOSTS.imapPort),
    smtpHost: config?.smtpHost || DEFAULT_MAIL_HOSTS.smtpHost,
    smtpPort: String(config?.smtpPort || DEFAULT_MAIL_HOSTS.smtpPort),
    username: config?.username || "",
    password: config?.hasPassword ? PASSWORD_MASK : "",
  };
}

export function MailConfigForm({ portalUserId, email }: MailConfigFormProps) {
  const [form, setForm] = useState<FormState>(toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/settings/mail", {
          headers: {
            "x-user-id": portalUserId,
            "x-user-email": email,
          },
        });
        const data = (await res.json()) as { success?: boolean; config?: MailConfigPublic; message?: string };
        if (!res.ok || !data.success || !data.config) {
          throw new Error(data.message || "設定の取得に失敗しました");
        }
        if (!cancelled) {
          setForm(toFormState(data.config));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "設定の取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [portalUserId, email]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": portalUserId,
          "x-user-email": email,
        },
        body: JSON.stringify({
          portalUserId,
          email,
          imapHost: form.imapHost,
          imapPort: Number(form.imapPort),
          smtpHost: form.smtpHost,
          smtpPort: Number(form.smtpPort),
          username: form.username,
          password: form.password,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; config?: MailConfigPublic };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "保存に失敗しました");
      }
      if (data.config) {
        setForm(toFormState(data.config));
      }
      setMessage(data.message || "メール接続設定を保存しました");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      {loading ? <p className="text-xs text-slate-500">設定を読み込んでいます...</p> : null}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="sm:col-span-2 text-xs font-semibold text-slate-600">
          IMAP サーバー
          <input className={fieldClass} value={form.imapHost} onChange={(e) => update("imapHost", e.target.value)} required />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          IMAP ポート
          <input className={fieldClass} value={form.imapPort} onChange={(e) => update("imapPort", e.target.value)} required />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-600">
          SMTP サーバー
          <input className={fieldClass} value={form.smtpHost} onChange={(e) => update("smtpHost", e.target.value)} required />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          SMTP ポート
          <input className={fieldClass} value={form.smtpPort} onChange={(e) => update("smtpPort", e.target.value)} required />
        </label>
        <label className="sm:col-span-3 text-xs font-semibold text-slate-600">
          メールユーザー名 / アカウント
          <input className={fieldClass} value={form.username} onChange={(e) => update("username", e.target.value)} autoComplete="username" required />
        </label>
        <label className="sm:col-span-3 text-xs font-semibold text-slate-600">
          メールパスワード
          <input className={fieldClass} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="current-password" required />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? "保存中..." : "接続保存"}
        </button>
        {message ? <span className="text-xs font-semibold text-emerald-700">{message}</span> : null}
        {error ? <span className="text-xs font-semibold text-rose-600">{error}</span> : null}
      </div>
    </form>
  );
}
