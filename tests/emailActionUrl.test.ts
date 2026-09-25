import { describe, expect, it } from "vitest";

import { extractActionUrl } from "../apps/web/lib/email-action-url";

describe("extractActionUrl", () => {
  it("prefers kaonavi.jp over an earlier generic URL", () => {
    const text = [
      "詳細は https://example.com/help を参照",
      "入力は https://p.kaonavi.jp/member/evaluations/2026 から",
    ].join("\n");
    expect(extractActionUrl(text, "カオナビ")).toBe(
      "https://p.kaonavi.jp/member/evaluations/2026"
    );
  });

  it("extracts TOKIUM keihi.com and cloudhouse URLs", () => {
    expect(extractActionUrl("承認 https://app.keihi.com/requests/1", "TOKIUM")).toBe(
      "https://app.keihi.com/requests/1"
    );
    expect(
      extractActionUrl('提出は <a href="https://app.cloudhouse.jp/docs/9">こちら</a>', "クラウドハウス労務")
    ).toBe("https://app.cloudhouse.jp/docs/9");
  });

  it("falls back to the first http(s) URL", () => {
    expect(extractActionUrl("案内 https://portal.hitowa.com/n/1 です。", "全社ポータル")).toBe(
      "https://portal.hitowa.com/n/1"
    );
  });
});
