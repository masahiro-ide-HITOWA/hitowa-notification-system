import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAIL_HOSTS,
  PASSWORD_KEEP_PLACEHOLDER,
  PASSWORD_MASK,
  isImapSecure,
  isSmtpSecure,
  mailAccountNameOrSessionEmail,
  parseMailConfigInput,
  parseMailSettingsActor,
  planMailPasswordUpdate,
  toPublicMailConfig,
} from "../apps/web/lib/mail-config";
import { decryptPassword } from "../apps/web/lib/mail-crypto";
import { getMailConfig, getMailConfigForConnection, resolveMailConfigPlaintext, saveMailConfig } from "../apps/web/lib/mail-config-store";
import {
  buildImapVerifyOptions,
  IMAP_VERIFY_TIMEOUT_MS,
  MailConfigVerifyError,
  verifyMailConnection,
} from "../apps/web/lib/mail-config-verify";
import type { MailConfigStoreDeps } from "../apps/web/lib/mail-config-store";

function memoryStore(): MailConfigStoreDeps & { items: Map<string, Record<string, unknown>> } {
  const items = new Map<string, Record<string, unknown>>();
  return {
    items,
    getItem: async (portalUserId) => items.get(portalUserId) ?? null,
    putItem: async (item) => {
      const portalUserId = String(item.portalUserId);
      items.set(portalUserId, { ...item });
    },
    now: () => "2026-09-18T03:00:00.000Z",
  };
}

const sampleInput = {
  imapHost: "mss191.kagoya.net",
  imapPort: 143,
  smtpHost: "mss191.kagoya.net",
  smtpPort: 587,
  username: "field@kagoya.jp",
  password: "plain-secret",
};

describe("parseMailSettingsActor / parseMailConfigInput", () => {
  it("prefers x-user-id and x-user-email headers", () => {
    expect(
      parseMailSettingsActor(
        { portalUserId: "body", email: "body@kagoya.jp" },
        "00400611",
        "field@kagoya.jp",
        "query"
      )
    ).toEqual({ portalUserId: "00400611", email: "field@kagoya.jp" });
  });

  it("uses request hosts and ports, otherwise KAGOYA defaults", () => {
    expect(
      parseMailConfigInput({
        username: sampleInput.username,
        password: sampleInput.password,
        imapHost: "imap.example.net",
        imapPort: 993,
        smtpHost: "smtp.example.net",
        smtpPort: 465,
      })
    ).toEqual({
      username: sampleInput.username,
      password: sampleInput.password,
      imapHost: "imap.example.net",
      imapPort: 993,
      smtpHost: "smtp.example.net",
      smtpPort: 465,
    });
    expect(parseMailConfigInput({ username: sampleInput.username, host: "mail.example.net", port: "993" })).toEqual({
      ...DEFAULT_MAIL_HOSTS,
      imapHost: "mail.example.net",
      imapPort: 993,
      username: sampleInput.username,
      password: "",
    });
    expect(parseMailConfigInput({ password: "x" })).toBeNull();
  });

  it("plans password keep vs replace vs missing", () => {
    expect(planMailPasswordUpdate("", "iv.tag.cipher")).toEqual({ kind: "keep" });
    expect(planMailPasswordUpdate(undefined, "iv.tag.cipher")).toEqual({ kind: "keep" });
    expect(planMailPasswordUpdate(PASSWORD_MASK, "iv.tag.cipher")).toEqual({ kind: "keep" });
    expect(planMailPasswordUpdate("new-secret", "iv.tag.cipher")).toEqual({
      kind: "replace",
      plaintext: "new-secret",
    });
    expect(planMailPasswordUpdate("", undefined)).toEqual({ kind: "missing" });
    expect(PASSWORD_KEEP_PLACEHOLDER).toBe("••••••••（変更しない場合は空欄のまま）");
  });
});

describe("saveMailConfig / getMailConfig", () => {
  it("encrypts the password on save and returns a masked public config", async () => {
    const deps = memoryStore();
    const saved = await saveMailConfig("00400611", sampleInput, deps);
    expect(saved.passwordMasked).toBe(PASSWORD_MASK);
    expect(saved.hasPassword).toBe(true);
    expect(saved.username).toBe("field@kagoya.jp");

    const stored = deps.items.get("00400611");
    expect(stored?.passwordEncrypted).toBeTruthy();
    expect(stored?.passwordEncrypted).not.toBe("plain-secret");
    expect(decryptPassword(String(stored?.passwordEncrypted))).toBe("plain-secret");

    const loaded = await getMailConfig("00400611", deps);
    expect(loaded).toEqual(saved);
    expect(JSON.stringify(loaded)).not.toContain("plain-secret");
  });

  it("keeps the existing encrypted password when the mask is posted", async () => {
    const deps = memoryStore();
    await saveMailConfig("00400611", sampleInput, deps);
    const previous = String(deps.items.get("00400611")?.passwordEncrypted);

    await saveMailConfig(
      "00400611",
      { ...sampleInput, password: PASSWORD_MASK, smtpPort: 465 },
      deps
    );

    expect(deps.items.get("00400611")?.passwordEncrypted).toBe(previous);
    expect(deps.items.get("00400611")?.smtpPort).toBe(465);
  });

  it("keeps the existing encrypted password when password is omitted or empty", async () => {
    const deps = memoryStore();
    await saveMailConfig("00400611", sampleInput, deps);
    const previous = String(deps.items.get("00400611")?.passwordEncrypted);

    const updated = await saveMailConfig(
      "00400611",
      { ...sampleInput, password: "", username: "field2@kagoya.jp", imapHost: "imap.example.net" },
      deps
    );

    expect(deps.items.get("00400611")?.passwordEncrypted).toBe(previous);
    expect(updated.username).toBe("field2@kagoya.jp");
    expect(updated.imapHost).toBe("imap.example.net");
    expect(updated.hasPassword).toBe(true);
    expect(JSON.stringify(updated)).not.toContain("plain-secret");

    const resolved = await resolveMailConfigPlaintext(
      "00400611",
      { ...sampleInput, password: "" },
      deps
    );
    expect(resolved.password).toBe("plain-secret");
  });

  it("re-encrypts when a new password is provided", async () => {
    const deps = memoryStore();
    await saveMailConfig("00400611", sampleInput, deps);
    const previous = String(deps.items.get("00400611")?.passwordEncrypted);

    await saveMailConfig("00400611", { ...sampleInput, password: "rotated-secret" }, deps);
    const next = String(deps.items.get("00400611")?.passwordEncrypted);
    expect(next).not.toBe(previous);
    expect(decryptPassword(next)).toBe("rotated-secret");
  });

  it("rejects an empty password when no existing secret is stored", async () => {
    const deps = memoryStore();
    await expect(
      saveMailConfig("00400611", { ...sampleInput, password: "" }, deps)
    ).rejects.toThrow("password is required");
  });

  it("decrypts only for internal connection use", async () => {
    const deps = memoryStore();
    await saveMailConfig("00400611", sampleInput, deps);
    const connection = await getMailConfigForConnection("00400611", deps);
    expect(connection?.password).toBe("plain-secret");
    expect(connection).toMatchObject({
      imapHost: sampleInput.imapHost,
      imapPort: sampleInput.imapPort,
      smtpHost: sampleInput.smtpHost,
      smtpPort: sampleInput.smtpPort,
    });
  });

  it("returns KAGOYA defaults when no config exists", async () => {
    const deps = memoryStore();
    const loaded = await getMailConfig("00400611", deps);
    expect(loaded).toMatchObject({
      ...DEFAULT_MAIL_HOSTS,
      username: "",
      hasPassword: false,
      passwordMasked: "",
    });
    expect(DEFAULT_MAIL_HOSTS).toEqual({
      imapHost: "imap.kagoya.net",
      imapPort: 993,
      smtpHost: "smtp.kagoya.net",
      smtpPort: 587,
    });
  });
});

describe("toPublicMailConfig", () => {
  it("never exposes the encrypted secret and keeps stored hosts", () => {
    const publicConfig = toPublicMailConfig("00400611", {
      username: "field@kagoya.jp",
      passwordEncrypted: "iv.tag.cipher",
      updatedAt: "2026-09-18T03:00:00.000Z",
    });
    expect(publicConfig.passwordMasked).toBe(PASSWORD_MASK);
    expect(publicConfig).toMatchObject(DEFAULT_MAIL_HOSTS);
    expect(publicConfig).not.toHaveProperty("passwordEncrypted");
  });
});

describe("IMAP/SMTP secure flags", () => {
  it("uses STARTTLS on IMAP 143 and implicit TLS on 993", () => {
    expect(isImapSecure(143)).toBe(false);
    expect(isImapSecure(993)).toBe(true);
  });

  it("uses STARTTLS on SMTP 587 and implicit TLS on 465", () => {
    expect(isSmtpSecure(587)).toBe(false);
    expect(isSmtpSecure(465)).toBe(true);
  });
});

describe("verifyMailConnection", () => {
  it("waits 20 seconds and disables strict TLS verification for KAGOYA IMAP", () => {
    const options = buildImapVerifyOptions({
      ...sampleInput,
      imapHost: "imap.kagoya.net",
      imapPort: 993,
    });
    const tls = options.tls as { rejectUnauthorized?: boolean; servername?: string };
    expect(IMAP_VERIFY_TIMEOUT_MS).toBe(20000);
    expect(options.connectionTimeout).toBe(20000);
    expect(options.socketTimeout).toBe(20000);
    expect(options.secure).toBe(true);
    expect(tls.rejectUnauthorized).toBe(false);
    expect(tls.servername).toBe("imap.kagoya.net");
  });

  it("runs IMAP then SMTP verification", async () => {
    const calls: string[] = [];
    await verifyMailConnection(sampleInput, {
      verifyImap: async () => {
        calls.push("imap");
      },
      verifySmtp: async () => {
        calls.push("smtp");
      },
    });
    expect(calls).toEqual(["imap", "smtp"]);
  });

  it("wraps connection failures", async () => {
    await expect(
      verifyMailConnection(sampleInput, {
        verifyImap: async () => {
          throw new Error("IMAP timeout");
        },
        verifySmtp: async () => undefined,
      })
    ).rejects.toThrow(/IMAP timeout/);
  });

  it("includes the IMAP server response when the command fails", async () => {
    const failure = new Error("Command failed") as Error & {
      responseText: string;
      executedCommand: string;
      stderr: string;
    };
    failure.responseText = "NO [AUTHENTICATIONFAILED] Invalid credentials for plain-secret";
    failure.executedCommand = "A1 LOGIN field@kagoya.jp plain-secret";
    failure.stderr = "imap stderr plain-secret";
    const rejected = await verifyMailConnection(sampleInput, {
      verifyImap: async () => {
        throw failure;
      },
      verifySmtp: async () => undefined,
    }).catch((error: unknown) => error);
    expect(rejected).toBeInstanceOf(MailConfigVerifyError);
    const message = rejected instanceof Error ? rejected.message : "";
    expect(message).toContain("message=Command failed");
    expect(message).toContain("responseText=NO [AUTHENTICATIONFAILED]");
    expect(message).toContain("stderr=imap stderr ********");
    expect(message).not.toContain("plain-secret");
  });

  it("uses the SAML session email when no mail account is saved", () => {
    expect(mailAccountNameOrSessionEmail("", "staff@kagoya.jp")).toBe("staff@kagoya.jp");
    expect(mailAccountNameOrSessionEmail("saved@kagoya.jp", "staff@kagoya.jp")).toBe(
      "saved@kagoya.jp"
    );
  });
});
