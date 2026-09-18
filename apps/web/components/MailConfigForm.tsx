"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ACCOUNT_NAME_PLACEHOLDER } from "@/lib/mail-config-defaults";
import { PASSWORD_KEEP_PLACEHOLDER, type MailConfigPublic } from "@/lib/mail-config";

interface MailConfigFormProps {
  portalUserId: string;
  email: string;
}

export function MailConfigForm({ portalUserId, email }: MailConfigFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
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
        const res = await fetch("/api/mail/config", {
          headers: { "x-user-id": portalUserId, "x-user-email": email },
        });
        const data = (await res.json()) as {
          success?: boolean;
          config?: MailConfigPublic;
          message?: string;
        };
        if (!res.ok || !data.success || !data.config) {
          throw new Error(data.message || "設定の取得に失敗しました");
        }
        if (!cancelled) {
          setUsername(data.config.username);
          setPassword("");
          setHasPassword(data.config.hasPassword);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/mail/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": portalUserId,
          "x-user-email": email,
        },
        body: JSON.stringify({
          portalUserId,
          email,
          username: username.trim(),
          password,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        config?: MailConfigPublic;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "保存に失敗しました");
      }
      if (data.config) {
        setUsername(data.config.username);
        setPassword("");
        setHasPassword(data.config.hasPassword);
      }
      setMessage(data.message || "接続を確認し、メール接続設定を保存しました");
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
      <label className="block text-xs font-semibold text-slate-600">
        アカウント名
        <input
          className={fieldClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder={ACCOUNT_NAME_PLACEHOLDER}
          required
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        パスワード
        <input
          className={fieldClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder={hasPassword ? PASSWORD_KEEP_PLACEHOLDER : ""}
          required={!hasPassword}
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? "保存中..." : "保存する"}
        </button>
        {message ? <span className="text-xs font-semibold text-emerald-700">{message}</span> : null}
        {error ? <span className="text-xs font-semibold text-rose-600">{error}</span> : null}
      </div>
    </form>
  );
}
