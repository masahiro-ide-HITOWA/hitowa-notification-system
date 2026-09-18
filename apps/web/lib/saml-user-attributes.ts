export interface SamlUserAttributes {
  name: string;
  email: string;
  companyCode: string;
  companyName: string;
  divisionName: string;
  officeCode: string;
  positionCode: string;
  employmentCode: string;
}

export interface PortalUserProfile extends SamlUserAttributes {
  portalUserId: string;
}

export const FALLBACK_SAML_ATTRIBUTES: SamlUserAttributes = {
  name: "井出征希テスト",
  email: "masahiro-ide@gr.hitowa.com",
  companyCode: "100",
  companyName: "株式会社HITOWA",
  divisionName: "イリーゼ品川",
  officeCode: "1",
  positionCode: "1570",
  employmentCode: "1",
};

export const DEMO_USER_PROFILE: PortalUserProfile = {
  portalUserId: "00400611",
  ...FALLBACK_SAML_ATTRIBUTES,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

export function mergeSamlAttributes(raw: unknown): SamlUserAttributes {
  if (!isRecord(raw)) {
    return { ...FALLBACK_SAML_ATTRIBUTES };
  }

  return {
    name: readString(raw.name, FALLBACK_SAML_ATTRIBUTES.name),
    email: readString(raw.email, FALLBACK_SAML_ATTRIBUTES.email),
    companyCode: readString(raw.companyCode, FALLBACK_SAML_ATTRIBUTES.companyCode),
    companyName: readString(raw.companyName, FALLBACK_SAML_ATTRIBUTES.companyName),
    divisionName: readString(raw.divisionName, FALLBACK_SAML_ATTRIBUTES.divisionName),
    officeCode: readString(raw.officeCode, FALLBACK_SAML_ATTRIBUTES.officeCode),
    positionCode: readString(raw.positionCode, FALLBACK_SAML_ATTRIBUTES.positionCode),
    employmentCode: readString(raw.employmentCode, FALLBACK_SAML_ATTRIBUTES.employmentCode),
  };
}

export function parseIssueCodeRequest(
  body: unknown,
  headerUserId: string | null
): { portalUserId: string; attributes: SamlUserAttributes } {
  const data = isRecord(body) ? body : {};
  const bodyUserId = readString(data.portalUserId, "");
  const portalUserId = headerUserId || bodyUserId || DEMO_USER_PROFILE.portalUserId;

  return {
    portalUserId,
    attributes: mergeSamlAttributes(data.attributes),
  };
}
