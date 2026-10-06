import { describe, expect, it } from "vitest";

import {
  PAGE_NO_CACHE_HEADERS,
  hasSessionCookie,
  isLocalDevHost,
  isPublicAuthPath,
  resolveGuardedPortalUser,
  shouldRedirectUnauthenticated,
} from "../apps/web/lib/auth-guard";
import { isMockAuthEnabled } from "../apps/web/lib/auth-mode";
import { resolvePortalUser } from "../apps/web/lib/auth-session";

describe("auth guard", () => {
  it("allows SAML and webhook paths without a session", () => {
    expect(isPublicAuthPath("/login")).toBe(true);
    expect(isPublicAuthPath("/api/auth/saml/login")).toBe(true);
    expect(isPublicAuthPath("/api/auth/logout")).toBe(true);
    expect(isPublicAuthPath("/api/webhook/line")).toBe(true);
    expect(isPublicAuthPath("/mypage")).toBe(false);
  });

  it("redirects localhost when there is no session", () => {
    expect(
      shouldRedirectUnauthenticated("/mypage", false, { USE_MOCK_AUTH: "true" }, "localhost")
    ).toBe(true);
  });

  it("redirects Amplify hosts even if mock env is missing at the Edge", () => {
    expect(
      shouldRedirectUnauthenticated("/mypage", false, {}, "main.d17na73qopyazf.amplifyapp.com")
    ).toBe(true);
  });

  it("redirects protected pages to SAML when mock auth is off and there is no session", () => {
    const samlEnv = { USE_MOCK_AUTH: "false" };
    expect(shouldRedirectUnauthenticated("/mypage", false, samlEnv, "localhost")).toBe(true);
    expect(shouldRedirectUnauthenticated("/settings", false, samlEnv, "localhost")).toBe(true);
    expect(shouldRedirectUnauthenticated("/mypage", true, samlEnv, "localhost")).toBe(false);
    expect(shouldRedirectUnauthenticated("/login", false, samlEnv, "localhost")).toBe(false);
    expect(shouldRedirectUnauthenticated("/api/auth/saml/login", false, samlEnv, "localhost")).toBe(
      false
    );
  });

  it("exposes no-store headers for Amplify/CloudFront", () => {
    expect(PAGE_NO_CACHE_HEADERS["Cache-Control"]).toContain("no-store");
    expect(PAGE_NO_CACHE_HEADERS.Pragma).toBe("no-cache");
  });

  it("treats an empty hitowa_session cookie as unauthenticated", () => {
    expect(hasSessionCookie(null)).toBe(false);
    expect(hasSessionCookie("hitowa_session=")).toBe(false);
    expect(hasSessionCookie("hitowa_session=abc.def")).toBe(true);
    expect(isLocalDevHost("localhost:3000")).toBe(true);
    expect(isLocalDevHost("main.amplifyapp.com")).toBe(false);
  });
});

describe("resolvePortalUser without mock", () => {
  it("never returns a demo user when USE_MOCK_AUTH is false", () => {
    const env = { USE_MOCK_AUTH: "false" };
    expect(resolvePortalUser(undefined, env, "localhost")).toBeNull();
    expect(resolvePortalUser("", env, "localhost")).toBeNull();
    expect(resolvePortalUser("not-a-valid-token", env, "localhost")).toBeNull();
    expect(isMockAuthEnabled({ NEXT_PUBLIC_USE_MOCK_AUTH: "false" }, "localhost")).toBe(false);
  });

  it("returns null off localhost even when mock env is unset or true", () => {
    const amplify = "main.d17na73qopyazf.amplifyapp.com";
    expect(resolveGuardedPortalUser(undefined, amplify, { USE_MOCK_AUTH: "true" })).toBeNull();
    expect(resolveGuardedPortalUser("", amplify, {})).toBeNull();
    expect(resolveGuardedPortalUser("not-a-valid-token", amplify, { USE_MOCK_AUTH: "true" })).toBeNull();
    expect(resolveGuardedPortalUser(undefined, "localhost", { USE_MOCK_AUTH: "true" })).toBeNull();
  });
});
