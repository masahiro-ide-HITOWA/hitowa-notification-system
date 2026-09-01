import type { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { createSamlCallbackHandler } from "../../packages/backend/handlers/samlCallback";
import { isGmailAddress } from "../../packages/backend/models/saml";
import { toSamlProfile } from "../../packages/backend/validators/samlResponse";

function createEvent(
  body: string,
  contentType = "application/json",
): APIGatewayProxyEvent {
  return {
    body,
    headers: { "content-type": contentType },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/saml/callback",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

describe("isGmailAddress", () => {
  it("accepts gmail.com and googlemail.com", () => {
    expect(isGmailAddress("user@gmail.com")).toBe(true);
    expect(isGmailAddress("user@GoogleMail.com")).toBe(true);
    expect(isGmailAddress("user@example.com")).toBe(false);
    expect(isGmailAddress(undefined)).toBe(false);
  });
});

describe("toSamlProfile", () => {
  it("reads NameID and mail attribute", () => {
    expect(
      toSamlProfile({ nameID: "emp-001", mail: "user@gmail.com" }),
    ).toEqual({ employee_id: "emp-001", mail: "user@gmail.com" });
  });

  it("throws when NameID is missing", () => {
    expect(() => toSamlProfile({ mail: "user@gmail.com" })).toThrow(
      "SAML NameID is missing",
    );
  });
});

describe("createSamlCallbackHandler", () => {
  it("turns google_chat ON when mail is a Gmail address", async () => {
    const upsertSettings = vi.fn().mockResolvedValue(undefined);
    const handler = createSamlCallbackHandler({
      tableName: "hitowa-notifications",
      validateSaml: vi.fn().mockResolvedValue({
        employee_id: "emp-001",
        mail: "user@gmail.com",
      }),
      upsertSettings,
    });

    const response = await handler(
      createEvent(JSON.stringify({ SAMLResponse: "encoded-assertion" })),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      employee_id: "emp-001",
      google_chat: true,
      jit_provisioned: true,
    });
    expect(upsertSettings).toHaveBeenCalledWith(
      "emp-001",
      true,
      "user@gmail.com",
    );
  });

  it("does not force google_chat ON when mail is absent", async () => {
    const upsertSettings = vi.fn().mockResolvedValue(undefined);
    const handler = createSamlCallbackHandler({
      tableName: "hitowa-notifications",
      validateSaml: vi.fn().mockResolvedValue({ employee_id: "emp-002" }),
      upsertSettings,
    });

    const response = await handler(
      createEvent("SAMLResponse=encoded", "application/x-www-form-urlencoded"),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).google_chat).toBe(false);
    expect(upsertSettings).toHaveBeenCalledWith("emp-002", false, undefined);
  });

  it("returns 401 when SAML validation fails", async () => {
    const handler = createSamlCallbackHandler({
      tableName: "hitowa-notifications",
      validateSaml: vi.fn().mockRejectedValue(new Error("bad signature")),
      upsertSettings: vi.fn(),
    });

    const response = await handler(
      createEvent(JSON.stringify({ SAMLResponse: "tampered" })),
    );

    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when SAMLResponse is missing", async () => {
    const handler = createSamlCallbackHandler({
      tableName: "hitowa-notifications",
      validateSaml: vi.fn(),
      upsertSettings: vi.fn(),
    });

    const response = await handler(createEvent("{}"));

    expect(response.statusCode).toBe(400);
  });
});
