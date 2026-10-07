import { describe, expect, it } from "vitest";
import { kagoyaAccountId, MAIL_SERVER_DEFAULTS } from "../apps/web/lib/mail-config-defaults";
import { imapRequireTls, imapTlsMode } from "../apps/web/lib/imap-port-fallback";

describe("KAGOYA account id", () => {
  it("prefixes the SAML local-part and keeps KAGOYA endpoints fixed", () => {
    expect(kagoyaAccountId("masahiro-ide@gr.hitowa.com")).toBe("kir088959.masahiro-ide");
    expect(kagoyaAccountId("  field@kagoya.jp ")).toBe("kir088959.field");
    expect(kagoyaAccountId("no-at-sign")).toBeNull();
    expect(MAIL_SERVER_DEFAULTS).toEqual({
      imapHost: "mss191.kagoya.net",
      imapPort: 143,
      smtpHost: "mss191.kagoya.net",
      smtpPort: 587,
    });
  });
});

describe("IMAP TLS mode", () => {
  it("uses STARTTLS on 143 and implicit TLS on 993", () => {
    expect(imapTlsMode(143)).toBe("starttls");
    expect(imapRequireTls(143)).toBe(true);
    expect(imapTlsMode(993)).toBe("ssl");
    expect(imapRequireTls(993)).toBe(false);
  });
});
