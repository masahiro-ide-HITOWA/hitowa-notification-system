import { describe, expect, it } from "vitest";

import { selectTargetLogGroups } from "../scripts/line-webhook-log-query";
import {
  formatLogEvent,
  isRecentlyActive,
  lineWebhookFilterPattern,
} from "../scripts/line-webhook-log-query";

describe("line webhook log query", () => {
  it("treats lastEventTime within 10 minutes as recent", () => {
    const now = Date.parse("2026-09-24T14:00:00.000Z");
    expect(isRecentlyActive(now - 9 * 60 * 1000, now)).toBe(true);
    expect(isRecentlyActive(now - 11 * 60 * 1000, now)).toBe(false);
    expect(isRecentlyActive(undefined, now)).toBe(false);
  });

  it("builds a CloudWatch substring filter for [line-webhook]", () => {
    expect(lineWebhookFilterPattern()).toBe('"[line-webhook]"');
  });

  it("falls back to Amplify groups when none are recently active", () => {
    const now = Date.parse("2026-09-24T14:00:00.000Z");
    const selected = selectTargetLogGroups(
      [
        { logGroupName: "/aws/lambda/other", lastEventTime: now - 60 * 60 * 1000 },
        { logGroupName: "/aws/amplify/hitowa-web", lastEventTime: now - 60 * 60 * 1000 },
      ],
      now
    );
    expect(selected.map((group) => group.logGroupName)).toEqual(["/aws/amplify/hitowa-web"]);
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
