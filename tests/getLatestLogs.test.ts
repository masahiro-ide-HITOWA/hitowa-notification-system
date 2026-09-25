import { describe, expect, it } from "vitest";

import {
  formatLogEvent,
  isRecentlyActive,
  isSsrComputeLogGroup,
  lineWebhookFilterPattern,
  selectTargetLogGroups,
} from "../scripts/line-webhook-log-query";

describe("line webhook log query", () => {
  it("treats lastEventTime within 60 minutes as recent", () => {
    const now = Date.parse("2026-09-24T14:00:00.000Z");
    expect(isRecentlyActive(now - 59 * 60 * 1000, now)).toBe(true);
    expect(isRecentlyActive(now - 61 * 60 * 1000, now)).toBe(false);
    expect(isRecentlyActive(undefined, now)).toBe(false);
  });

  it("matches Amplify SSR lambda and spitfire prefixes", () => {
    expect(isSsrComputeLogGroup("/aws/lambda/amplify-foo-compute")).toBe(true);
    expect(isSsrComputeLogGroup("/aws/spitfire/service/bar")).toBe(true);
    expect(isSsrComputeLogGroup("/aws/amplify/app/compute")).toBe(true);
    expect(isSsrComputeLogGroup("/aws/rds/instance")).toBe(false);
  });

  it("builds a CloudWatch substring filter for [line-webhook]", () => {
    expect(lineWebhookFilterPattern()).toBe('"[line-webhook]"');
  });

  it("includes lambda and spitfire groups even if lastEventTime is stale", () => {
    const now = Date.parse("2026-09-24T14:00:00.000Z");
    const selected = selectTargetLogGroups(
      [
        { logGroupName: "/aws/lambda/other", lastEventTime: now - 2 * 60 * 60 * 1000 },
        { logGroupName: "/aws/spitfire/web", lastEventTime: now - 2 * 60 * 60 * 1000 },
        { logGroupName: "/aws/amplify/hitowa-web", lastEventTime: now - 2 * 60 * 60 * 1000 },
      ],
      now
    );
    expect(selected.map((group) => group.logGroupName).sort()).toEqual([
      "/aws/amplify/hitowa-web",
      "/aws/lambda/other",
      "/aws/spitfire/web",
    ]);
  });

  it("formats events for terminal output", () => {
    expect(
      formatLogEvent({
        logGroupName: "/aws/amplify/app",
        timestamp: Date.parse("2026-09-24T05:00:00.000Z"),
        message: "[line-webhook] replyRes.status 400",
      })
    ).toContain("[line-webhook] replyRes.status 400");
  });
});
