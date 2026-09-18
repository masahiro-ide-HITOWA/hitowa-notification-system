import { describe, expect, it } from "vitest";

import { canUseWebMail } from "../apps/web/lib/mail-permission";

describe("canUseWebMail", () => {
  it("returns false for HQ employees on @hitowa.com", () => {
    expect(canUseWebMail("mei-sei@hitowa.com")).toBe(false);
    expect(canUseWebMail("taro@HITOWA.COM")).toBe(false);
  });

  it("returns true for other domains such as KAGOYA field staff", () => {
    expect(canUseWebMail("staff@kagoya.jp")).toBe(true);
    expect(canUseWebMail("user@example.com")).toBe(true);
  });

  it("returns false when the email is missing or invalid", () => {
    expect(canUseWebMail(undefined)).toBe(false);
    expect(canUseWebMail("")).toBe(false);
    expect(canUseWebMail("not-an-email")).toBe(false);
  });
});
