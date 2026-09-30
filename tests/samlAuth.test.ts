import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  resolvePortalUser,
  sessionCookieFromHeader,
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
});
