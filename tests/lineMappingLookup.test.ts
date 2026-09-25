import { describe, expect, it } from "vitest";

import { isLinkedStatusPayload } from "../apps/web/lib/line-link-status-payload";
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

  it("accepts API payloads that the settings UI hydrates on reload", () => {
    expect(
      isLinkedStatusPayload({
        success: true,
        isLinked: true,
        status: "COMPLETED",
        lineUserId: "U123",
      })
    ).toBe(true);
    expect(
      isLinkedStatusPayload({ success: true, isLinked: false, status: "PENDING", lineUserId: null })
    ).toBe(false);
    expect(isLinkedStatusPayload({ success: false })).toBe(false);
  });

  it("looks up COMPLETED mappings by email or portalUserId after reload", async () => {
    const items = [
      {
        email: "masahiro-ide@gr.hitowa.com",
        portalUserId: "00400611",
        oneTimeCode: "123456",
        status: "COMPLETED",
        lineUserId: "Uline",
      },
    ];
    const byEmail = await findLineMapping(
      { email: "masahiro-ide@gr.hitowa.com" },
      memoryReader(items)
    );
    expect(statusFromMappingItem(byEmail).isLinked).toBe(true);

    const byPortal = await findLineMapping(
      { portalUserId: "00400611" },
      {
        ...memoryReader(items),
        scanByPortalUserId: async (portalUserId) =>
          items.find((item) => item.portalUserId === portalUserId) ?? null,
      }
    );
    expect(statusFromMappingItem(byPortal).isLinked).toBe(true);
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
