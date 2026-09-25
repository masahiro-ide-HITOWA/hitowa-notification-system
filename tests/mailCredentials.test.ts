import { afterEach, describe, expect, it } from "vitest";

import {
  SAAS_MAIL_SECRET_NAME,
  getMailCredentials,
  mailCredentialsFromEnv,
  parseMailCredentialsSecret,
  resetMailCredentialsCache,
  toMailConfigInput,
} from "../apps/web/lib/secrets";

const secretJson = JSON.stringify({
  email: "saas@hitowa.com",
  password: "from-sm",
  host: "imap.example.com",
  port: 993,
});

afterEach(() => {
  resetMailCredentialsCache();
});

describe("mail credentials", () => {
  it("parses Secrets Manager JSON and maps to IMAP config", () => {
    expect(parseMailCredentialsSecret(secretJson)).toEqual({
      email: "saas@hitowa.com",
      password: "from-sm",
      host: "imap.example.com",
      port: 993,
    });
    expect(parseMailCredentialsSecret("{not-json")).toBeNull();
    expect(
      toMailConfigInput({
        email: "saas@hitowa.com",
        password: "from-sm",
        host: "imap.example.com",
        port: 993,
      })
    ).toMatchObject({
      imapHost: "imap.example.com",
      imapPort: 993,
      username: "saas@hitowa.com",
      password: "from-sm",
    });
  });

  it("reads local .env fallbacks", () => {
    expect(
      mailCredentialsFromEnv({
        MAIL_EMAIL: "local@hitowa.com",
        MAIL_PASSWORD: "local-pass",
        MAIL_IMAP_HOST: "mss191.kagoya.net",
        MAIL_IMAP_PORT: "143",
      })
    ).toEqual({
      email: "local@hitowa.com",
      password: "local-pass",
      host: "mss191.kagoya.net",
      port: 143,
    });
  });

  it("fetches from Secrets Manager and caches for the TTL window", async () => {
    let calls = 0;
    const deps = {
      fetchSecretString: async (secretId: string) => {
        calls += 1;
        expect(secretId).toBe(SAAS_MAIL_SECRET_NAME);
        return secretJson;
      },
      env: { NODE_ENV: "production" } as NodeJS.ProcessEnv,
      now: () => 1_000,
      cacheTtlMs: 8 * 60 * 1000,
    };
    const first = await getMailCredentials(deps);
    const second = await getMailCredentials(deps);
    expect(first.password).toBe("from-sm");
    expect(second).toEqual(first);
    expect(calls).toBe(1);

    const afterTtl = await getMailCredentials({ ...deps, now: () => 1_000 + 8 * 60 * 1000 + 1 });
    expect(afterTtl.host).toBe("imap.example.com");
    expect(calls).toBe(2);
  });

  it("falls back to env when Secrets Manager is unavailable", async () => {
    const credentials = await getMailCredentials({
      fetchSecretString: async () => {
        throw new Error("UnrecognizedClientException");
      },
      env: {
        NODE_ENV: "production",
        MAIL_EMAIL: "fallback@hitowa.com",
        MAIL_PASSWORD: "env-pass",
        MAIL_HOST: "imap.local.test",
        MAIL_PORT: "143",
      },
    });
    expect(credentials).toEqual({
      email: "fallback@hitowa.com",
      password: "env-pass",
      host: "imap.local.test",
      port: 143,
    });
  });

  it("uses env only in test without calling AWS", async () => {
    const credentials = await getMailCredentials({
      env: {
        NODE_ENV: "test",
        MAIL_SAAS_EMAIL: "test@hitowa.com",
        MAIL_SAAS_PASSWORD: "test-pass",
        MAIL_SAAS_HOST: "imap.test.local",
        MAIL_SAAS_PORT: "993",
      },
    });
    expect(credentials.email).toBe("test@hitowa.com");
  });
});
