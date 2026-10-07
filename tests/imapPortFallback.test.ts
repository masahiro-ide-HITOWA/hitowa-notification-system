import { describe, expect, it } from "vitest";

import {
  imapRequireTls,
  imapTlsMode,
  isImapTransportFailure,
  startTlsFallbackPort,
  withImapPortFallback,
} from "../apps/web/lib/imap-port-fallback";

describe("IMAP port fallback", () => {
  it("describes 993 as SSL and 143 as STARTTLS", () => {
    expect(imapTlsMode(993)).toBe("ssl");
    expect(imapRequireTls(993)).toBe(false);
    expect(imapTlsMode(143)).toBe("starttls");
    expect(imapRequireTls(143)).toBe(true);
    expect(startTlsFallbackPort(993)).toBe(143);
    expect(startTlsFallbackPort(143)).toBeNull();
  });

  it("falls back only after a transport timeout", async () => {
    const ports: number[] = [];
    const timeout = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    const connected = await withImapPortFallback(993, async (port) => {
      ports.push(port);
      if (port === 993) {
        throw timeout;
      }
      return "ok";
    });
    expect(connected).toBe("ok");
    expect(ports).toEqual([993, 143]);
  });

  it("does not fall back after an authentication failure", async () => {
    const ports: number[] = [];
    const auth = Object.assign(new Error("AUTHENTICATIONFAILED"), { code: "AUTHENTICATIONFAILED" });
    await expect(
      withImapPortFallback(993, async (port) => {
        ports.push(port);
        throw auth;
      })
    ).rejects.toBe(auth);
    expect(ports).toEqual([993]);
    expect(isImapTransportFailure(auth)).toBe(false);
    expect(isImapTransportFailure(new Error("connect ETIMEDOUT 10.0.0.1:993"))).toBe(true);
  });
});
