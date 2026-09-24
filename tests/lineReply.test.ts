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

    await replyLineText("reply-token", "完了");

    expect(lineReplyAuthorizationHeader("test-token")).toBe("Bearer test-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(LINE_REPLY_URL);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
  });
});
