import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAIL_HOSTS,
  PASSWORD_MASK,
  parseMailConfigInput,
  parseMailSettingsActor,
  toPublicMailConfig,
} from "../apps/web/lib/mail-config";
import { decryptPassword } from "../apps/web/lib/mail-crypto";
import { getMailConfig, getMailConfigForConnection, saveMailConfig } from "../apps/web/lib/mail-config-store";
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
  imapHost: "imap.kagoya.net",
  imapPort: 993,
  smtpHost: "smtp.kagoya.net",
  smtpPort: 465,
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

  it("parses IMAP/SMTP fields including string ports", () => {
    expect(
      parseMailConfigInput({
        ...sampleInput,
        imapPort: "993",
        smtpPort: "587",
      })
    ).toEqual({ ...sampleInput, imapPort: 993, smtpPort: 587 });
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
      { ...sampleInput, password: PASSWORD_MASK, smtpPort: 587 },
      deps
    );

    expect(deps.items.get("00400611")?.passwordEncrypted).toBe(previous);
    expect(deps.items.get("00400611")?.smtpPort).toBe(587);
  });

  it("decrypts only for internal connection use", async () => {
    const deps = memoryStore();
    await saveMailConfig("00400611", sampleInput, deps);
    const connection = await getMailConfigForConnection("00400611", deps);
    expect(connection?.password).toBe("plain-secret");
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
  });
});

describe("toPublicMailConfig", () => {
  it("never exposes the encrypted secret", () => {
    const publicConfig = toPublicMailConfig("00400611", {
      imapHost: "imap.kagoya.net",
      imapPort: 993,
      smtpHost: "smtp.kagoya.net",
      smtpPort: 465,
      username: "field@kagoya.jp",
      passwordEncrypted: "iv.tag.cipher",
      updatedAt: "2026-09-18T03:00:00.000Z",
    });
    expect(publicConfig.passwordMasked).toBe(PASSWORD_MASK);
    expect(publicConfig).not.toHaveProperty("passwordEncrypted");
  });
});
