import {
  FALLBACK_SAML_ATTRIBUTES,
  type PortalUserProfile,
} from "@/lib/saml-user-attributes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(profile: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim() !== "") {
      return value[0].trim();
    }
  }
  return null;
}

const EMAIL_ATTRIBUTE_KEYS = [
  "email",
  "mail",
  "Email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];

const EMPLOYEE_ID_ATTRIBUTE_KEYS = [
  "employeeNumber",
  "EmployeeNumber",
  "employee_id",
  "employeeId",
  "userId",
  "user_id",
  "uid",
];

function isEmployeeNumber(value: string): boolean {
  return /^\d{8}$/.test(value.trim());
}

function attributeCandidates(profile: Record<string, unknown>, keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const value = firstString(profile, [key]);
    if (value !== null) {
      values.push(value);
    }
  }
  return values;
}

export function profileFromSamlAttributes(profile: Record<string, unknown>): PortalUserProfile {
  const nameId = firstString(profile, ["nameID", "NameID"]);
  const email =
    firstString(profile, EMAIL_ATTRIBUTE_KEYS) ??
    (nameId !== null && nameId.includes("@") ? nameId : "");
  const employeeCandidates = attributeCandidates(profile, [
    ...EMPLOYEE_ID_ATTRIBUTE_KEYS,
    "nameID",
    "NameID",
  ]);
  const portalUserId =
    employeeCandidates.find((value) => isEmployeeNumber(value)) ??
    employeeCandidates.find((value) => !value.includes("@")) ??
    "";
  const divisionName =
    firstString(profile, ["department", "divisionName", "Department"]) ??
    FALLBACK_SAML_ATTRIBUTES.divisionName;
  const name =
    firstString(profile, ["displayName", "name", "cn"]) ??
    FALLBACK_SAML_ATTRIBUTES.name;

  return {
    portalUserId,
    email,
    name,
    divisionName,
    companyCode: FALLBACK_SAML_ATTRIBUTES.companyCode,
    companyName: FALLBACK_SAML_ATTRIBUTES.companyName,
    officeCode: FALLBACK_SAML_ATTRIBUTES.officeCode,
    positionCode: FALLBACK_SAML_ATTRIBUTES.positionCode,
    employmentCode: FALLBACK_SAML_ATTRIBUTES.employmentCode,
  };
}

export function samlBodyFromRequestData(data: unknown): Record<string, string> | null {
  if (!isRecord(data)) {
    return null;
  }
  const samlResponse = data.SAMLResponse;
  if (typeof samlResponse !== "string" || samlResponse.trim() === "") {
    return null;
  }
  const body: Record<string, string> = { SAMLResponse: samlResponse };
  if (typeof data.RelayState === "string" && data.RelayState.trim() !== "") {
    body.RelayState = data.RelayState;
  }
  return body;
}
