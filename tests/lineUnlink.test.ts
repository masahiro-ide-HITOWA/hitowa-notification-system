import { describe, expect, it } from "vitest";

import { mappingOneTimeCodes, parseUnlinkPortalUserId } from "../apps/web/lib/line-unlink";

describe("parseUnlinkPortalUserId", () => {
  it("prefers the x-user-id header", () => {
    expect(parseUnlinkPortalUserId({ portalUserId: "body-user" }, "header-user")).toBe(
      "header-user"
    );
  });

  it("reads portalUserId from the JSON body", () => {
    expect(parseUnlinkPortalUserId({ portalUserId: "body-user" }, null)).toBe("body-user");
  });

  it("returns null when neither header nor body has an id", () => {
    expect(parseUnlinkPortalUserId({}, null)).toBeNull();
  });
});

describe("mappingOneTimeCodes", () => {
  it("extracts oneTimeCode from COMPLETED mapping items", () => {
    expect(
      mappingOneTimeCodes([
        { oneTimeCode: "123456", status: "COMPLETED" },
        { status: "COMPLETED" },
        { oneTimeCode: "654321" },
      ])
    ).toEqual(["123456", "654321"]);
  });
});
