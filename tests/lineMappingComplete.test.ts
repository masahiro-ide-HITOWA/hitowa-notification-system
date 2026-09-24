import { describe, expect, it } from "vitest";

import { completeLineLinkByCode, isExpiredMapping, mappingUpdateKey } from "../apps/web/lib/line-mapping-complete";
import { findLineMapping, type LineMappingReader } from "../apps/web/lib/line-mapping-lookup";

function memoryReader(
  items: Array<Record<string, unknown>>,
  options?: { failQuery?: boolean; failGet?: boolean; failScan?: boolean }
): LineMappingReader {
  return {
    getByKey: async (key) => {
      if (options?.failGet) {
        throw new Error("ValidationException");
      }
      const [[field, value]] = Object.entries(key);
      return items.find((item) => item[field] === value) ?? null;
    },
    queryByOneTimeCode: async (code) => {
      if (options?.failQuery) {
        throw new Error("ResourceNotFoundException");
      }
      return items.find((item) => item.oneTimeCode === code) ?? null;
    },
    scanByOneTimeCode: async (code) => {
      if (options?.failScan) {
        throw new Error("AccessDeniedException");
      }
      return items.find((item) => item.oneTimeCode === code) ?? null;
    },
  };
}

describe("completeLineLinkByCode", () => {
  it("prefers email as the DynamoDB update key", () => {
    expect(mappingUpdateKey({ email: "a@b.com", oneTimeCode: "111111" })).toEqual({
      email: "a@b.com",
    });
    expect(mappingUpdateKey({ oneTimeCode: "111111" })).toEqual({ oneTimeCode: "111111" });
  });

  it("treats past expiresAt as expired", () => {
    expect(isExpiredMapping({ expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(true);
    expect(isExpiredMapping({ expiresAt: "2999-01-01T00:00:00.000Z" })).toBe(false);
    expect(isExpiredMapping({})).toBe(false);
  });

  it("finds a code via scan when GSI and Get-by-code fail", async () => {
    const items = [{ email: "masahiro-ide@gr.hitowa.com", oneTimeCode: "654321", status: "PENDING" }];
    const found = await findLineMapping({ code: "654321" }, memoryReader(items, { failQuery: true, failGet: true }));
    expect(found?.email).toBe("masahiro-ide@gr.hitowa.com");
  });

  it("updates status COMPLETED and lineUserId", async () => {
    const items: Array<Record<string, unknown>> = [
      { email: "masahiro-ide@gr.hitowa.com", oneTimeCode: "123456", status: "PENDING" },
    ];
    const updates: Array<{ key: Record<string, string>; lineUserId: string }> = [];

    const result = await completeLineLinkByCode(
      "123456",
      "UlineUser",
      memoryReader(items),
      {
        updateLink: async (key, lineUserId) => {
          updates.push({ key, lineUserId });
        },
      }
    );

    expect(result).toEqual({ ok: true });
    expect(updates).toEqual([{ key: { email: "masahiro-ide@gr.hitowa.com" }, lineUserId: "UlineUser" }]);
  });

  it("returns not_found when the code is unknown", async () => {
    const result = await completeLineLinkByCode("000000", "U1", memoryReader([]), {
      updateLink: async () => undefined,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});
