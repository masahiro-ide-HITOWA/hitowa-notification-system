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

export const EMPTY_SAML_ATTRIBUTES: SamlUserAttributes = {
  name: "",
  email: "",
  companyCode: "",
  companyName: "",
  divisionName: "",
  officeCode: "",
  positionCode: "",
  employmentCode: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

export function mergeSamlAttributes(raw: unknown): SamlUserAttributes {
  if (!isRecord(raw)) {
    return { ...EMPTY_SAML_ATTRIBUTES };
  }

  return {
    name: readString(raw.name, ""),
    email: readString(raw.email, ""),
    companyCode: readString(raw.companyCode, ""),
    companyName: readString(raw.companyName, ""),
    divisionName: readString(raw.divisionName, ""),
    officeCode: readString(raw.officeCode, ""),
    positionCode: readString(raw.positionCode, ""),
    employmentCode: readString(raw.employmentCode, ""),
  };
}

export function parseIssueCodeRequest(
  body: unknown,
  headerUserId: string | null
): { portalUserId: string; attributes: SamlUserAttributes } | null {
  const data = isRecord(body) ? body : {};
  const bodyUserId = readString(data.portalUserId, "");
  const portalUserId = (headerUserId?.trim() || bodyUserId).trim();
  if (portalUserId === "") {
    return null;
  }

  return {
    portalUserId,
    attributes: mergeSamlAttributes(data.attributes),
  };
}
