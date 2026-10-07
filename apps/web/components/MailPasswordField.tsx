"use client";

import { useState } from "react";

interface MailPasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required: boolean;
  fieldClass: string;
}

export function MailPasswordField({
  value,
  onChange,
  placeholder,
  required,
  fieldClass,
}: MailPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "パスワードを隠す" : "パスワードを表示";

  return (
    <label className="block text-xs font-semibold text-slate-600">
      パスワード
      <span className="relative mt-1 block">
        <input
          className={`${fieldClass} mt-0 pr-10`}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="current-password"
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          aria-label={label}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-4.2 4.8" />
      <path d="M6.1 6.1C3.8 7.8 2 12 2 12a18.6 18.6 0 0 0 6.2 6.7" />
    </svg>
  );
}
