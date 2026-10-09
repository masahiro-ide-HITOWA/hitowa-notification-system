import { describe, expect, it } from "vitest";
import { createSessionToken } from "../apps/web/lib/auth-session";
import { cookieDomainFromEnv } from "../apps/web/lib/deploy-env";
import { handleUnreadCount } from "../apps/web/app/api/notifications/unread-count/route";
import { applyPortalCors } from "../apps/web/lib/portal-cors";
import { assertRequiredEnv, missingRequiredEnv } from "../apps/web/lib/required-env";
import { NextResponse } from "next/server";

const productionEnv = {
  NODE_ENV: "production",
  SESSION_SECRET: "session",
  ENCRYPTION_KEY: "encrypt",
  COOKIE_DOMAIN: ".hitowa.com",
  PORTAL_ORIGIN: "https://portal.hitowa.com",
  SAML_ENTRY_POINT: "https://idp.example.test/sso",
  SAML_IDP_ISSUER: "https://idp.example.test",
  SAML_CERT: "cert",
  SAML_ISSUER: "https://notification.hitowa.com/saml",
  SAML_CALLBACK_URL: "https://notification.hitowa.com/api/auth/saml/callback",
};

describe("required production env", () => {
  it("lists missing keys and skips the check outside production", () => {
    expect(missingRequiredEnv({ NODE_ENV: "test" })).toEqual([
      "SESSION_SECRET",
      "ENCRYPTION_KEY",
      "COOKIE_DOMAIN",
      "PORTAL_ORIGIN",
      "SAML_ENTRY_POINT",
      "SAML_IDP_ISSUER",
      "SAML_CERT",
      "SAML_ISSUER",
      "SAML_CALLBACK_URL",
    ]);
    expect(() => assertRequiredEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertRequiredEnv(productionEnv)).not.toThrow();
    expect(() => assertRequiredEnv({ ...productionEnv, SESSION_SECRET: "  " })).toThrow(
      /SESSION_SECRET/
    );
  });

  it("treats localhost and a wildcard portal origin as unset", () => {
    expect(cookieDomainFromEnv({ COOKIE_DOMAIN: "localhost" })).toBeUndefined();
    expect(cookieDomainFromEnv({ COOKIE_DOMAIN: ".hitowa.com" })).toBe(".hitowa.com");
    expect(() => assertRequiredEnv({ ...productionEnv, PORTAL_ORIGIN: "*" })).toThrow(/PORTAL_ORIGIN/);
  });
});

describe("portal CORS and unread count", () => {
  it("allows only the configured portal origin with credentials", () => {
    const previousOrigin = process.env.PORTAL_ORIGIN;
    process.env.PORTAL_ORIGIN = "https://portal.hitowa.com";
    try {
      const allowed = applyPortalCors(
        new Request("https://notification.hitowa.com/api/notifications/unread-count", {
          headers: { origin: "https://portal.hitowa.com" },
        }),
        NextResponse.json({ ok: true })
      );
      expect(allowed.headers.get("access-control-allow-origin")).toBe("https://portal.hitowa.com");
      expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");

      const rejected = applyPortalCors(
        new Request("https://notification.hitowa.com/api/notifications/unread-count", {
          headers: { origin: "https://evil.example" },
        }),
        NextResponse.json({ ok: true })
      );
      expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      if (previousOrigin === undefined) {
        delete process.env.PORTAL_ORIGIN;
      } else {
        process.env.PORTAL_ORIGIN = previousOrigin;
      }
    }
  });

  it("returns the unread count for the session cookie and 401 without it", async () => {
    const token = createSessionToken(
      {
        portalUserId: "00400611",
        email: "masahiro-ide@gr.hitowa.com",
        name: "井出",
        divisionName: "現場",
        companyCode: "",
        companyName: "",
        officeCode: "",
        positionCode: "",
        employmentCode: "",
      },
      Date.now(),
      { SESSION_SECRET: process.env.SESSION_SECRET }
    );
    const ok = await handleUnreadCount(
      new Request("https://notification.hitowa.com/api/notifications/unread-count", {
        headers: {
          origin: "https://portal.hitowa.com",
          cookie: `hitowa_session=${token}`,
        },
      }),
      { countUnread: async () => 3 }
    );
    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toEqual({ success: true, unreadCount: 3 });

    const missing = await handleUnreadCount(
      new Request("https://notification.hitowa.com/api/notifications/unread-count"),
      { countUnread: async () => 3 }
    );
    expect(missing.status).toBe(401);
  });

  it("sends SLO to the IdP URL and clears the parent-domain cookie", async () => {
    const previousSlo = process.env.SAML_SLO_URL;
    const previousDomain = process.env.COOKIE_DOMAIN;
    process.env.SAML_SLO_URL = "https://idp.example.test/logout";
    process.env.COOKIE_DOMAIN = ".hitowa.com";
    try {
      const { GET } = await import("../apps/web/app/api/auth/saml/slo/route");
      const response = await GET(
        new Request("https://notification.hitowa.com/api/auth/saml/slo", {
          headers: { "x-forwarded-proto": "https" },
        })
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("https://idp.example.test/logout");
      expect(response.headers.getSetCookie().some((cookie) => /Domain=\.hitowa\.com/i.test(cookie))).toBe(
        true
      );
    } finally {
      if (previousSlo === undefined) {
        delete process.env.SAML_SLO_URL;
      } else {
        process.env.SAML_SLO_URL = previousSlo;
      }
      if (previousDomain === undefined) {
        delete process.env.COOKIE_DOMAIN;
      } else {
        process.env.COOKIE_DOMAIN = previousDomain;
      }
    }
  });
});
