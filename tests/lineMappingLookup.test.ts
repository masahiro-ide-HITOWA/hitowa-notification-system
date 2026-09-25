import { describe, expect, it } from "vitest";

import {
  findLineMapping,
  pendingLineStatus,
  statusFromMappingItem,
  type LineMappingReader,
} from "../apps/web/lib/line-mapping-lookup";

function memoryReader(
  items: Array<Record<string, unknown>>,
  options?: { failQuery?: boolean; failGet?: boolean }
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
  };
}

describe("line mapping lookup", () => {
  it("returns PENDING fallback when nothing is found", () => {
    expect(statusFromMappingItem(null)).toEqual(pendingLineStatus());
    expect(pendingLineStatus()).toEqual({
      success: true,
      status: "PENDING",
      isLinked: false,
      lineUserId: null,
    });
  });

  it("treats COMPLETED or a lineUserId as linked", () => {
    expect(statusFromMappingItem({ status: "COMPLETED" }).isLinked).toBe(true);
    expect(statusFromMappingItem({ status: "PENDING", lineUserId: "U123" }).status).toBe(
      "COMPLETED"
    );
    expect(statusFromMappingItem({ status: "PENDING" }).isLinked).toBe(false);
    expect(statusFromMappingItem({ status: "ACTIVE", lineUserId: "U123" }).isLinked).toBe(true);
    expect(statusFromMappingItem({ status: "DISABLED", lineUserId: "U123" }).isLinked).toBe(false);
  });

  it("looks up by oneTimeCode then by email partition key", async () => {
    const items = [
      { email: "masahiro-ide@gr.hitowa.com", oneTimeCode: "123456", status: "PENDING" },
    ];
    const byCode = await findLineMapping({ code: "123456" }, memoryReader(items));
    expect(byCode?.email).toBe("masahiro-ide@gr.hitowa.com");

    const byEmail = await findLineMapping(
      { email: "masahiro-ide@gr.hitowa.com" },
      memoryReader(items, { failQuery: true })
    );
    expect(byEmail?.oneTimeCode).toBe("123456");
  });

  it("swallows DynamoDB key/index errors and returns null", async () => {
    const found = await findLineMapping(
      { code: "123456", email: "a@b.com" },
      memoryReader([], { failQuery: true, failGet: true })
    );
    expect(found).toBeNull();
  });
});
