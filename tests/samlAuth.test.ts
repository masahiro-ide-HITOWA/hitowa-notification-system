import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  isSecureSessionCookie,
  resolvePortalUser,
  sessionCookieFromHeader,
  sessionCookieOptions,
  verifySessionToken,
} from "../apps/web/lib/auth-session";
import {
  isMockAuthEnabled,
} from "../apps/web/lib/auth-mode";
import {
  normalizeSamlCertificate,
  readSamlEnv,
} from "../apps/web/lib/saml";
import { profileFromSamlAttributes, samlBodyFromRequestData } from "../apps/web/lib/saml-profile";
import { DEMO_USER_PROFILE } from "../apps/web/lib/saml-user-attributes";
import { originFromEnv, resolveRequestOrigin, samlLoginAbsoluteUrl } from "../apps/web/lib/request-origin";

const samlEnv = {
  USE_MOCK_AUTH: "false",
  SAML_ENTRY_POINT: "https://idp.example.test/sso",
  SAML_IDP_ISSUER: "https://idp.example.test",
  SAML_CERT: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtestdummy",
  SAML_ISSUER: "https://portal.example.test/saml",
  SAML_CALLBACK_URL: "https://portal.example.test/api/auth/saml/callback",
};

describe("isMockAuthEnabled", () => {
  it("keeps mock auth unless USE_MOCK_AUTH is the string false", () => {
    expect(isMockAuthEnabled({})).toBe(true);
    expect(isMockAuthEnabled({ USE_MOCK_AUTH: "true" })).toBe(true);
    expect(isMockAuthEnabled({ USE_MOCK_AUTH: "false" })).toBe(false);
  });
});

describe("readSamlEnv", () => {
  it("returns null when any SAML variable is missing", () => {
    expect(readSamlEnv({ ...samlEnv, SAML_CERT: "" })).toBeNull();
  });

  it("normalizes a PEM-less IdP certificate", () => {
    const config = readSamlEnv(samlEnv);
    expect(config?.entryPoint).toBe(samlEnv.SAML_ENTRY_POINT);
    expect(config?.idpIssuer).toBe(samlEnv.SAML_IDP_ISSUER);
    expect(config?.issuer).toBe(samlEnv.SAML_ISSUER);
    expect(config?.callbackUrl).toBe(samlEnv.SAML_CALLBACK_URL);
    expect(config?.idpCert).toContain("BEGIN CERTIFICATE");
  });
});

describe("normalizeSamlCertificate", () => {
  it("wraps a one-line cert body", () => {
    const pem = normalizeSamlCertificate("abc");
    expect(pem.startsWith("-----BEGIN CERTIFICATE-----")).toBe(true);
    expect(pem.endsWith("-----END CERTIFICATE-----")).toBe(true);
  });
});

describe("profileFromSamlAttributes", () => {
  it("maps email, employeeNumber, and department", () => {
    expect(
      profileFromSamlAttributes({
        email: "staff@gr.hitowa.com",
        employeeNumber: "12345678",
        department: "営業部",
        displayName: "現場太郎",
      })
    ).toMatchObject({
      email: "staff@gr.hitowa.com",
      portalUserId: "12345678",
      divisionName: "営業部",
      name: "現場太郎",
    });
  });

  it("does not keep the demo identity when switching accounts", () => {
    expect(
      profileFromSamlAttributes({
        email: "other@hitowa.com",
        employeeNumber: "99999999",
      })
    ).toMatchObject({
      email: "other@hitowa.com",
      portalUserId: "99999999",
    });
    expect(profileFromSamlAttributes({ email: "only@hitowa.com" }).portalUserId).toBe("");
  });
});

describe("samlBodyFromRequestData", () => {
  it("requires SAMLResponse", () => {
    expect(samlBodyFromRequestData({ RelayState: "/" })).toBeNull();
    expect(samlBodyFromRequestData({ SAMLResponse: "abc", RelayState: "/mypage" })).toEqual({
      SAMLResponse: "abc",
      RelayState: "/mypage",
    });
  });
});

describe("session token", () => {
  it("round-trips a profile and rejects tampering", () => {
    const env = { SESSION_SECRET: "test-secret" };
    const token = createSessionToken(DEMO_USER_PROFILE, Date.now(), env);
    expect(verifySessionToken(token, Date.now(), env)).toMatchObject({
      email: DEMO_USER_PROFILE.email,
      portalUserId: DEMO_USER_PROFILE.portalUserId,
    });
    expect(verifySessionToken(token.slice(0, -1) + "x", Date.now(), env)).toBeNull();
  });

  it("uses demo profile when mock auth is enabled", () => {
    expect(resolvePortalUser(undefined, { USE_MOCK_AUTH: "true" })).toEqual(DEMO_USER_PROFILE);
    expect(resolvePortalUser(undefined, { USE_MOCK_AUTH: "false" })).toBeNull();
  });

  it("reads the session cookie from Cookie header", () => {
    expect(sessionCookieFromHeader("a=1; hitowa_session=token.value; b=2")).toBe("token.value");
    expect(sessionCookieFromHeader(null)).toBeUndefined();
  });

  it("uses SameSite=None and Secure on HTTPS for SAML ACS", () => {
    const httpsRequest = new Request("https://main.d17na73qopyazf.amplifyapp.com/api/auth/saml/callback", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isSecureSessionCookie(httpsRequest, { NODE_ENV: "production" })).toBe(true);
    expect(sessionCookieOptions(httpsRequest, { NODE_ENV: "production" })).toMatchObject({
      httpOnly: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });
    expect(
      sessionCookieOptions(new Request("http://localhost/api/auth/saml/callback"), {
        NODE_ENV: "test",
      })
    ).toMatchObject({
      secure: false,
      sameSite: "lax",
    });
  });
});

describe("SAML routes with mock auth", () => {
  it("login redirects home, callback is 400, metadata is 404", async () => {
    const previous = process.env.USE_MOCK_AUTH;
    process.env.USE_MOCK_AUTH = "true";
    try {
      const { GET: loginGet } = await import("../apps/web/app/api/auth/saml/login/route");
      const { POST: callbackPost } = await import("../apps/web/app/api/auth/saml/callback/route");
      const { GET: metadataGet } = await import("../apps/web/app/api/auth/saml/metadata/route");

      const loginRes = await loginGet(new Request("http://localhost/api/auth/saml/login"));
      expect(loginRes.status).toBe(307);
      expect(loginRes.headers.get("location")).toBe("http://localhost/");

      const callbackRes = await callbackPost(
        new Request("http://localhost/api/auth/saml/callback", { method: "POST" })
      );
      expect(callbackRes.status).toBe(400);

      const metadataRes = await metadataGet();
      expect(metadataRes.status).toBe(404);
    } finally {
      if (previous === undefined) {
        delete process.env.USE_MOCK_AUTH;
      } else {
        process.env.USE_MOCK_AUTH = previous;
      }
    }
  });

  it("logout clears the session cookie and redirects to SAML login", async () => {
    const { GET: logoutGet, POST: logoutPost } = await import(
      "../apps/web/app/api/auth/logout/route"
    );
    const getRes = await logoutGet(new Request("http://localhost/api/auth/logout"));
    expect(getRes.status).toBe(307);
    expect(getRes.headers.get("location")).toBe("http://localhost/api/auth/saml/login");
    expect(getRes.headers.get("cache-control")).toContain("no-store");
    expect(getRes.headers.get("pragma")).toBe("no-cache");
    expect(getRes.headers.get("expires")).toBe("0");
    expect(getRes.headers.get("set-cookie") ?? "").toMatch(/hitowa_session=/);
    expect(getRes.headers.get("set-cookie") ?? "").toMatch(/Path=\//i);
    expect(getRes.headers.get("set-cookie") ?? "").toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);

    const postRes = await logoutPost(
      new Request("http://localhost/api/auth/logout", { method: "POST" })
    );
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toEqual({
      success: true,
      loginPath: "/api/auth/saml/login",
      loginUrl: "http://localhost/api/auth/saml/login",
    });
  });

  it("logout redirects using the forwarded Amplify host instead of localhost", async () => {
    const { GET: logoutGet } = await import("../apps/web/app/api/auth/logout/route");
    const getRes = await logoutGet(
      new Request("http://localhost:3000/api/auth/logout", {
        headers: {
          host: "main.d17na73qopyazf.amplifyapp.com",
          "x-forwarded-proto": "https",
        },
      })
    );
    expect(getRes.headers.get("location")).toBe(
      "https://main.d17na73qopyazf.amplifyapp.com/api/auth/saml/login"
    );
  });

  it("complete GET writes the session cookie then redirects to mypage", async () => {
    const previous = process.env.USE_MOCK_AUTH;
    process.env.USE_MOCK_AUTH = "false";
    try {
      const { GET: completeGet } = await import("../apps/web/app/api/auth/saml/complete/route");
      const token = createSessionToken(DEMO_USER_PROFILE);
      const res = await completeGet(
        new Request("http://localhost/api/auth/saml/complete?t=" + encodeURIComponent(token))
      );
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("http://localhost/mypage");
      expect(res.headers.get("set-cookie") ?? "").toMatch(/hitowa_session=/);
      expect(res.headers.get("set-cookie") ?? "").toMatch(/Path=\//i);
    } finally {
      if (previous === undefined) {
        delete process.env.USE_MOCK_AUTH;
      } else {
        process.env.USE_MOCK_AUTH = previous;
      }
    }
  });
});

describe("resolveRequestOrigin", () => {
  it("prefers Host and x-forwarded-proto over request.url", () => {
    const request = new Request("http://localhost:3000/api/auth/logout", {
      headers: {
        host: "main.d17na73qopyazf.amplifyapp.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(resolveRequestOrigin(request)).toBe("https://main.d17na73qopyazf.amplifyapp.com");
    expect(samlLoginAbsoluteUrl(request)).toBe(
      "https://main.d17na73qopyazf.amplifyapp.com/api/auth/saml/login"
    );
  });

  it("falls back to SAML_ISSUER or NEXTAUTH_URL origin", () => {
    expect(
      originFromEnv({
        SAML_ISSUER: "https://portal.example.test/api/auth/saml/metadata",
      })
    ).toBe("https://portal.example.test");
    expect(originFromEnv({ NEXTAUTH_URL: "https://from-next.example.test" })).toBe(
      "https://from-next.example.test"
    );
  });
});