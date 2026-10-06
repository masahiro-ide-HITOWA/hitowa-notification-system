import { describe, expect, it } from "vitest";

import {
  EMPTY_SAML_ATTRIBUTES,
  parseIssueCodeRequest,
} from "../apps/web/lib/saml-user-attributes";

describe("parseIssueCodeRequest", () => {
  it("reads attributes from the request body for DynamoDB Item.attributes", () => {
    const result = parseIssueCodeRequest(
      {
        portalUserId: "emp-100",
        attributes: {
          name: "山田 太郎",
          email: "taro@hitowa.com",
          companyName: "株式会社HITOWA",
          divisionName: "情報システム部",
          officeCode: "99",
        },
      },
      null
    );

    expect(result.portalUserId).toBe("emp-100");
    expect(result.attributes.name).toBe("山田 太郎");
    expect(result.attributes.email).toBe("taro@hitowa.com");
    expect(result.attributes.companyName).toBe("株式会社HITOWA");
    expect(result.attributes.divisionName).toBe("情報システム部");
    expect(result.attributes.officeCode).toBe("99");
    expect(result?.attributes.companyCode).toBe("");
  });

  it("keeps missing attributes empty and rejects a request without a user id", () => {
    const result = parseIssueCodeRequest({}, "header-user");
    expect(result?.portalUserId).toBe("header-user");
    expect(result?.attributes).toEqual(EMPTY_SAML_ATTRIBUTES);
    expect(parseIssueCodeRequest({}, null)).toBeNull();
    expect(parseIssueCodeRequest({}, "  ")).toBeNull();
  });
});
