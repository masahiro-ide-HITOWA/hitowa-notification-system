import { describe, expect, it } from "vitest";

import { mappingEmailKey, unlinkLineMapping } from "../apps/web/lib/line-mapping-unlink";
import { parseUnlinkEmail, parseUnlinkPortalUserId } from "../apps/web/lib/line-unlink";
import type { LineMappingReader } from "../apps/web/lib/line-mapping-lookup";

function memoryReader(items: Array<Record<string, unknown>>): LineMappingReader {
  return {
    getByKey: async (key) => {
      const [[field, value]] = Object.entries(key);
      return items.find((item) => item[field] === value) ?? null;
    },
    queryByOneTimeCode: async (code) => items.find((item) => item.oneTimeCode === code) ?? null,
    scanByOneTimeCode: async (code) => items.find((item) => item.oneTimeCode === code) ?? null,
    scanByPortalUserId: async (portalUserId) =>
      items.find(
        (item) =>
          item.portalUserId === portalUserId &&
          (item.status === "COMPLETED" || (typeof item.lineUserId === "string" && item.lineUserId !== ""))
      ) ?? null,
  };
}

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

describe("parseUnlinkEmail", () => {
  it("prefers the x-user-email header", () => {
    expect(parseUnlinkEmail({ email: "body@example.com" }, "header@example.com")).toBe(
      "header@example.com"
    );
  });
});

describe("unlinkLineMapping", () => {
  it("updates DynamoDB with email as the primary key", async () => {
    const items = [
      {
        email: "masahiro-ide@gr.hitowa.com",
        oneTimeCode: "123456",
        portalUserId: "00400611",
        status: "COMPLETED",
        lineUserId: "Uline",
      },
    ];
    const keys: string[] = [];
    const result = await unlinkLineMapping(
      { portalUserId: "00400611" },
      memoryReader(items),
      {
        markUnlinked: async (email) => {
          keys.push(email);
        },
      }
    );
    expect(result).toEqual({ ok: true, email: "masahiro-ide@gr.hitowa.com" });
    expect(keys).toEqual(["masahiro-ide@gr.hitowa.com"]);
    expect(mappingEmailKey(items[0])).toBe("masahiro-ide@gr.hitowa.com");
  });

  it("returns not_found when no linked mapping exists", async () => {
    const result = await unlinkLineMapping({ email: "nobody@example.com" }, memoryReader([]), {
      markUnlinked: async () => undefined,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns missing_email when the item has no email attribute", async () => {
    const result = await unlinkLineMapping(
      { portalUserId: "00400611" },
      memoryReader([{ portalUserId: "00400611", status: "COMPLETED", lineUserId: "U1" }]),
      { markUnlinked: async () => undefined }
    );
    expect(result).toEqual({ ok: false, reason: "missing_email" });
  });
});
