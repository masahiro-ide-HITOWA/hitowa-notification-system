import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAIL_CONFIG_SAVED_MESSAGE } from "@/lib/mail-config-client";
import { handleMailConfigSave, handleMailConfigTest } from "@/lib/mail-config-handlers";
import { resolveMailConfigPlaintext, saveMailConfig } from "@/lib/mail-config-store";
import { MailConfigVerifyError, verifyMailConnection } from "@/lib/mail-config-verify";

vi.mock("@/lib/mail-config-store", () => ({
  getMailConfig: vi.fn(),
  saveMailConfig: vi.fn(),
  resolveMailConfigPlaintext: vi.fn(),
}));

vi.mock("@/lib/mail-config-verify", () => ({
  MailConfigVerifyError: class MailConfigVerifyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "MailConfigVerifyError";
    }
  },
  verifyMailConnection: vi.fn(),
}));

const savedConfig = {
  portalUserId: "00400611",
  imapHost: "imap.kagoya.net",
  imapPort: 993,
  smtpHost: "smtp.kagoya.net",
  smtpPort: 587,
  username: "field@kagoya.jp",
  passwordMasked: "********",
  hasPassword: true,
  updatedAt: "2026-10-07T00:00:00.000Z",
};

function saveRequest(): Request {
  return new Request("http://localhost/api/mail/config", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "00400611",
      "x-user-email": "field@kagoya.jp",
    },
    body: JSON.stringify({
      username: "field@kagoya.jp",
      password: "secret",
      imapHost: "imap.kagoya.net",
      imapPort: 993,
    }),
  });
}

describe("mail config save and connection test", () => {
  beforeEach(() => {
    vi.mocked(saveMailConfig).mockReset();
    vi.mocked(resolveMailConfigPlaintext).mockReset();
    vi.mocked(verifyMailConnection).mockReset();
    vi.mocked(saveMailConfig).mockResolvedValue(savedConfig);
    vi.mocked(resolveMailConfigPlaintext).mockImplementation(async (_id, config) => config);
    vi.mocked(verifyMailConnection).mockResolvedValue(undefined);
  });

  it("saves settings without calling the IMAP connection test", async () => {
    const response = await handleMailConfigSave(saveRequest());
    const body = (await response.json()) as { success: boolean; message: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      message: MAIL_CONFIG_SAVED_MESSAGE,
      config: savedConfig,
    });
    expect(saveMailConfig).toHaveBeenCalledWith(
      "00400611",
      expect.objectContaining({
        imapHost: "mss191.kagoya.net",
        imapPort: 143,
        smtpHost: "mss191.kagoya.net",
        smtpPort: 587,
        username: "kir088959.field",
        password: "secret",
      })
    );
    expect(verifyMailConnection).not.toHaveBeenCalled();
    expect(resolveMailConfigPlaintext).not.toHaveBeenCalled();
  });

  it("runs the connection test without saving", async () => {
    const response = await handleMailConfigTest(saveRequest());
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyMailConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        imapHost: "mss191.kagoya.net",
        imapPort: 143,
        smtpPort: 587,
        username: "kir088959.field",
      })
    );
    expect(saveMailConfig).not.toHaveBeenCalled();
  });

  it("returns the verify error from the connection test", async () => {
    vi.mocked(verifyMailConnection).mockRejectedValue(new MailConfigVerifyError("IMAP timeout"));
    const response = await handleMailConfigTest(saveRequest());
    const body = (await response.json()) as { success: boolean; message: string };

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.message).toBe("IMAP timeout");
    expect(saveMailConfig).not.toHaveBeenCalled();
  });
});
