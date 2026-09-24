import { afterEach, describe, expect, it, vi } from "vitest";

import { LINE_REPLY_URL, lineReplyAuthorizationHeader, replyLineText } from "../apps/web/lib/line-reply";

describe("replyLineText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends Bearer LINE_CHANNEL_ACCESS_TOKEN and awaits Reply API", async () => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await replyLineText("reply-token", "完了");

    expect(result).toEqual({ ok: true, status: 200, errorMessage: null, skipped: false });
    expect(lineReplyAuthorizationHeader("test-token")).toBe("Bearer test-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(LINE_REPLY_URL);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("returns status and errorMessage when Reply API is not ok", async () => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"message":"Invalid reply token"}', { status: 400 }))
    );

    const result = await replyLineText("expired-token", "完了");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toContain("status=400");
  });
});
