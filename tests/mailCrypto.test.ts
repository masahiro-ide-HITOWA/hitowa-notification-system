import { describe, expect, it } from "vitest";

import { decryptPassword, encryptPassword } from "../apps/web/lib/mail-crypto";

describe("mail-crypto", () => {
  it("encrypts and decrypts a password with AES-256-GCM", () => {
    const plain = "kagoya-secret-pass";
    const encrypted = encryptPassword(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptPassword(encrypted)).toBe(plain);
  });

  it("produces different ciphertext for the same password", () => {
    const first = encryptPassword("same-password");
    const second = encryptPassword("same-password");
    expect(first).not.toBe(second);
    expect(decryptPassword(first)).toBe("same-password");
    expect(decryptPassword(second)).toBe("same-password");
  });

  it("rejects an invalid payload", () => {
    expect(() => decryptPassword("not-valid")).toThrow(/Invalid encrypted password payload/);
  });
});
