import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

import { isGmailAddress, type SamlProfile } from "../models/saml";
import {
  createDocumentClient,
  upsertUserSettingsFromSaml,
} from "../services/notificationStore";
import {
  createSamlValidator,
  type ValidateSamlResponse,
} from "../validators/samlResponse";

const JSON_HEADERS = { "Content-Type": "application/json" };

export type SamlCallbackDependencies = {
  tableName: string;
  validateSaml: ValidateSamlResponse;
  upsertSettings?: (
    employeeId: string,
    googleChatEnabled: boolean,
    mail: string | undefined,
  ) => Promise<void>;
  now?: () => Date;
};

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function readRawBody(event: APIGatewayProxyEvent): string {
  if (event.body === null || event.body === undefined || event.body === "") {
    return "";
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
}

export function extractSamlResponse(
  event: APIGatewayProxyEvent,
): string | undefined {
  const raw = readRawBody(event);
  if (!raw) {
    return undefined;
  }

  const contentType =
    event.headers["content-type"] ?? event.headers["Content-Type"] ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(raw).get("SAMLResponse") ?? undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "SAMLResponse" in parsed &&
      typeof parsed.SAMLResponse === "string"
    ) {
      return parsed.SAMLResponse;
    }
  } catch {
    return new URLSearchParams(raw).get("SAMLResponse") ?? undefined;
  }
  return undefined;
}

export function createSamlCallbackHandler(deps: SamlCallbackDependencies) {
  const now = deps.now ?? (() => new Date());
  const upsertSettings =
    deps.upsertSettings ??
    ((employeeId, googleChatEnabled, mail) =>
      upsertUserSettingsFromSaml(
        createDocumentClient(new DynamoDBClient({})),
        deps.tableName,
        {
          employeeId,
          googleChatEnabled,
          mail,
          updatedAt: now().toISOString(),
        },
      ));

  return async (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> => {
    const samlResponse = extractSamlResponse(event);
    if (!samlResponse) {
      return jsonResponse(400, { errors: ["SAMLResponse is required"] });
    }

    let profile: SamlProfile;
    try {
      profile = await deps.validateSaml(samlResponse);
    } catch (error) {
      console.error("SAML validation failed", error);
      return jsonResponse(401, { message: "Invalid SAML Response" });
    }

    const googleChatEnabled = isGmailAddress(profile.mail);
    try {
      await upsertSettings(profile.employee_id, googleChatEnabled, profile.mail);
    } catch (error) {
      console.error("Failed to upsert user settings", error);
      return jsonResponse(500, { message: "Failed to provision user" });
    }

    return jsonResponse(200, {
      employee_id: profile.employee_id,
      google_chat: googleChatEnabled,
      jit_provisioned: true,
    });
  };
}

function defaultValidator(): ValidateSamlResponse {
  const callbackUrl = process.env.SAML_CALLBACK_URL ?? "";
  const issuer = process.env.SAML_ISSUER ?? "";
  const idpCert = process.env.SAML_IDP_CERT ?? "";
  if (!callbackUrl || !issuer || !idpCert) {
    return async () => {
      throw new Error("SAML IdP configuration is missing");
    };
  }
  return createSamlValidator({
    callbackUrl,
    issuer,
    idpCert,
    audience: process.env.SAML_AUDIENCE,
  });
}

/** SAML ACS Lambda のエントリポイント */
export const handler = createSamlCallbackHandler({
  tableName: process.env.NOTIFICATIONS_TABLE_NAME ?? "",
  validateSaml: defaultValidator(),
});
