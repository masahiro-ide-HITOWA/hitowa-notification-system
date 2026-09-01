import { SAML } from "@node-saml/node-saml";

import { type SamlProfile } from "../models/saml";

export type ValidateSamlResponse = (samlResponse: string) => Promise<SamlProfile>;

export type SamlIdpConfig = {
  callbackUrl: string;
  issuer: string;
  idpCert: string;
  audience?: string;
};

function readStringAttribute(
  profile: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = profile[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function toSamlProfile(profile: Record<string, unknown>): SamlProfile {
  const employeeId =
    readStringAttribute(profile, "nameID") ??
    readStringAttribute(profile, "employee_id");
  if (!employeeId) {
    throw new Error("SAML NameID is missing");
  }
  return {
    employee_id: employeeId,
    mail: readStringAttribute(profile, "mail"),
  };
}

export function createSamlValidator(config: SamlIdpConfig): ValidateSamlResponse {
  const saml = new SAML({
    callbackUrl: config.callbackUrl,
    issuer: config.issuer,
    idpCert: config.idpCert,
    audience: config.audience,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
  });

  return async (samlResponse: string) => {
    const result = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
    });
    if (!result.profile) {
      throw new Error("SAML profile is empty");
    }
    return toSamlProfile(result.profile as Record<string, unknown>);
  };
}
