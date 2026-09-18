import { describe, expect, it, vi } from "vitest";

import {
  buildAnnouncementScanFilter,
  chunkLineUserIds,
  createLineMulticastSender,
  extractAnnouncementRecipients,
  formatAnnouncementMessage,
  LINE_MULTICAST_LIMIT,
  LINE_MULTICAST_URL,
  parseAnnouncementRequest,
  sendAnnouncementMulticast,
} from "../apps/web/lib/line-announcement";

describe("parseAnnouncementRequest", () => {
  it("accepts ALL delivery without officeCode", () => {
    const parsed = parseAnnouncementRequest({
      title: "定期点検",
      content: "明日実施します",
      targetType: "ALL",
    });
    expect(parsed).toEqual({
      ok: true,
      request: { title: "定期点検", content: "明日実施します", targetType: "ALL" },
    });
  });

  it("requires officeCode for OFFICE delivery", () => {
    const parsed = parseAnnouncementRequest({
      title: "施設連絡",
      content: "本日閉館",
      targetType: "OFFICE",
    });
    expect(parsed.ok).toBe(false);
  });

  it("reads SAML officeCode for OFFICE delivery", () => {
    const parsed = parseAnnouncementRequest({
      title: "施設連絡",
      content: "本日閉館",
      targetType: "OFFICE",
      officeCode: "1",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.request.officeCode).toBe("1");
    }
  });
});

describe("extractAnnouncementRecipients", () => {
  const items = [
    { status: "COMPLETED", lineUserId: "U1", attributes: { officeCode: "1" } },
    { status: "COMPLETED", lineUserId: "U2", attributes: { officeCode: "2" } },
    { status: "PENDING", lineUserId: "U3", attributes: { officeCode: "1" } },
    { status: "COMPLETED", attributes: { officeCode: "1" } },
    { status: "COMPLETED", lineUserId: "U1", attributes: { officeCode: "1" } },
  ];

  it("extracts every completed LINE user for ALL", () => {
    expect(extractAnnouncementRecipients(items, "ALL")).toEqual(["U1", "U2"]);
  });

  it("filters by attributes.officeCode for OFFICE", () => {
    expect(extractAnnouncementRecipients(items, "OFFICE", "1")).toEqual(["U1"]);
  });
});

describe("announcement message and multicast", () => {
  it("formats the LINE text payload", () => {
    expect(formatAnnouncementMessage("点検", "明日実施")).toBe(
      "【お知らせ】点検\n------------------\n明日実施"
    );
  });

  it("splits recipients into LINE multicast batches of 500", () => {
    const ids = Array.from({ length: LINE_MULTICAST_LIMIT + 2 }, (_, i) => `U${i}`);
    const chunks = chunkLineUserIds(ids);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(2);
  });

  it("counts only successful multicast chunks", async () => {
    const sendChunk = vi
      .fn<(to: string[], text: string) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const count = await sendAnnouncementMulticast(
      Array.from({ length: 501 }, (_, i) => `U${i}`),
      "text",
      sendChunk
    );

    expect(sendChunk).toHaveBeenCalledTimes(2);
    expect(count).toBe(500);
  });

  it("posts to the LINE multicast endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const sender = createLineMulticastSender("token-1", fetchImpl);
    await expect(sender(["U1", "U2"], "hello")).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      LINE_MULTICAST_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      })
    );
  });

  it("adds officeCode to the DynamoDB scan filter for OFFICE", () => {
    const filter = buildAnnouncementScanFilter({
      title: "t",
      content: "c",
      targetType: "OFFICE",
      officeCode: "99",
    });
    expect(filter.FilterExpression).toContain("attributes.officeCode = :officeCode");
    expect(filter.ExpressionAttributeValues[":officeCode"]).toBe("99");
  });
});
