import { describe, expect, it } from "vitest";

import {
  formatUserMappingReport,
  parseEmailArg,
  toUserMappingReport,
} from "../scripts/check-user-mapping";

describe("check-user-mapping", () => {
  it("parses email from argv or --email", () => {
    expect(parseEmailArg(["masahiro-ide@hitowa.com"])).toBe("masahiro-ide@hitowa.com");
    expect(parseEmailArg(["--email", "a@b.com"])).toBe("a@b.com");
    expect(parseEmailArg(["--email=a@b.com"])).toBe("a@b.com");
    expect(parseEmailArg([])).toBeNull();
  });

  it("prints status and lastReply fields", () => {
    const report = toUserMappingReport("a@b.com", {
      status: "COMPLETED",
      lineUserId: "U123",
      lastReplyStatus: 400,
      lastReplyError: "status=400 body=Invalid reply token",
      lastReplyAt: "2026-09-24T06:00:00.000Z",
    });
    expect(report?.lastReplyStatus).toBe(400);
    expect(report && formatUserMappingReport(report)).toContain("status: COMPLETED");
  });
});
