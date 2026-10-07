"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_MAIL_HOSTS,
  mailAccountNameOrSessionEmail,
  PASSWORD_KEEP_PLACEHOLDER,
  type MailConfigPublic,
} from "@/lib/mail-config";
import {
  MAIL_CONFIG_SAVED_MESSAGE,
  mailApiErrorMessage,
  mailConfigRequestBody,
  mailConfigRequestHeaders,
  readApiJson,
  type MailConfigApiBody,
} from "@/lib/mail-config-client";

interface MailConfigFormProps {
  portalUserId: string;
  email: string;
}

export function MailConfigForm({ portalUserId, email }: MailConfigFormProps) {
  const [imapHost, setImapHost] = useState(DEFAULT_MAIL_HOSTS.imapHost);
  const [imapPort, setImapPort] = useState(String(DEFAULT_MAIL_HOSTS.imapPort));
  const [smtpHost, setSmtpHost] = useState(DEFAULT_MAIL_HOSTS.smtpHost);
  const [smtpPort, setSmtpPort] = useState(String(DEFAULT_MAIL_HOSTS.smtpPort));
  const [username, setUsername] = useState(email);
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const applyConfig = (config: MailConfigPublic) => {
    setImapHost(config.imapHost);
    setImapPort(String(config.imapPort));
    setSmtpHost(config.smtpHost);
    setSmtpPort(String(config.smtpPort));
    setUsername(mailAccountNameOrSessionEmail(config.username, email));
    setPassword("");
    setHasPassword(config.hasPassword);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/mail/config", {
          headers: { "x-user-id": portalUserId, "x-user-email": email },
        });
        const data = await readApiJson<MailConfigApiBody>(res);
        if (!res.ok || !data.success || !data.config) {
          throw new Error(data.message || "設定の取得に失敗しました");
        }
        if (!cancelled) {
          applyConfig(data.config);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(mailApiErrorMessage(loadError, "設定の取得に失敗しました"));
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

  const requestBody = () =>
    mailConfigRequestBody({
      portalUserId,
      email,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      username,
      password,
    });

  const postConfig = async (path: string): Promise<MailConfigApiBody> => {
    const res = await fetch(path, {
      method: "POST",
      headers: mailConfigRequestHeaders(portalUserId, email),
      body: requestBody(),
    });
    const data = await readApiJson<MailConfigApiBody>(res);
    if (!res.ok || !data.success) {
      throw new Error(data.message || "処理に失敗しました");
    }
    return data;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data = await postConfig("/api/mail/config");
      if (data.config) {
        applyConfig(data.config);
      }
      setMessage(MAIL_CONFIG_SAVED_MESSAGE);
    } catch (saveError) {
      setError(mailApiErrorMessage(saveError, "保存に失敗しました"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const data = await postConfig("/api/mail/config/test");
      setMessage(data.message || "メールサーバーへの接続に成功しました");
    } catch (testError) {
      setError(mailApiErrorMessage(testError, "メール接続テストに失敗しました"));
    } finally {
      setTesting(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none";
  const busy = saving || testing || loading;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      {loading ? <p className="text-xs text-slate-500">設定を読み込んでいます...</p> : null}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
        <label className="block text-xs font-semibold text-slate-600">
          IMAP サーバー
          <input className={fieldClass} value={imapHost} onChange={(e) => setImapHost(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          IMAP ポート
          <input className={fieldClass} value={imapPort} onChange={(e) => setImapPort(e.target.value)} inputMode="numeric" required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          SMTP サーバー
          <input className={fieldClass} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          SMTP ポート
          <input className={fieldClass} value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} inputMode="numeric" required />
        </label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">
        アカウント名
        <input className={fieldClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder={email} required />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        パスワード
        <input className={fieldClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder={hasPassword ? PASSWORD_KEEP_PLACEHOLDER : ""} required={!hasPassword} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? "保存中..." : "設定を保存"}
        </button>
        <button type="button" disabled={busy} onClick={() => void handleTest()} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 disabled:opacity-50">
          {testing ? "接続テスト中..." : "接続テスト"}
        </button>
        {message ? <span className="text-xs font-semibold text-emerald-700">{message}</span> : null}
        {error ? <span className="text-xs font-semibold text-rose-600">{error}</span> : null}
      </div>
    </form>
  );
}
