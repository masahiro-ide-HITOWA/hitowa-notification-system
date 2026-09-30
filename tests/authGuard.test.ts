import { describe, expect, it } from "vitest";

import {
  isPublicAuthPath,
  shouldRedirectUnauthenticated,
} from "../apps/web/lib/auth-guard";

describe("auth guard", () => {
  it("allows SAML and webhook paths without a session", () => {
    expect(isPublicAuthPath("/api/auth/saml/login")).toBe(true);
    expect(isPublicAuthPath("/api/auth/logout")).toBe(true);
    expect(isPublicAuthPath("/api/webhook/line")).toBe(true);
    expect(isPublicAuthPath("/mypage")).toBe(false);
  });

  it("does not redirect when mock auth is enabled", () => {
    expect(
      shouldRedirectUnauthenticated("/mypage", false, { USE_MOCK_AUTH: "true" })
    ).toBe(false);
  });

  it("redirects protected pages to SAML when mock auth is off and there is no session", () => {
    const samlEnv = { USE_MOCK_AUTH: "false" };
    expect(shouldRedirectUnauthenticated("/mypage", false, samlEnv)).toBe(true);
    expect(shouldRedirectUnauthenticated("/mypage", true, samlEnv)).toBe(false);
    expect(shouldRedirectUnauthenticated("/api/auth/saml/login", false, samlEnv)).toBe(
      false
    );
  });
});
