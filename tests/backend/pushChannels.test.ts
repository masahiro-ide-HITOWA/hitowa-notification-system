import { describe, expect, it, vi } from "vitest";

import { sendToEnabledChannels } from "../../packages/backend/clients/pushChannels";
import type { UserChannelSettings } from "../../packages/backend/models/channelSettings";
import type { NotificationPayload } from "../../packages/backend/models/notification";

const payload: NotificationPayload = {
  target_employee_id: "emp-001",
  source_system: "kaonavi",
  title: "承認依頼",
  body: "本文",
  action_url: "https://example.com/a",
  category: "hr",
};

const settings: UserChannelSettings = {
  employee_id: "emp-001",
  google_chat: true,
  line: true,
  slack: false,
  google_chat_webhook_url: "https://chat.googleapis.com/v1/spaces/AAA/messages",
  line_user_id: "Uline",
};

describe("sendToEnabledChannels", () => {
  it("posts Google Chat and LINE in parallel", async () => {
    const httpPost = vi.fn().mockResolvedValue({ ok: true, status: 200, text: "ok" });

    const results = await sendToEnabledChannels(payload, settings, {
      lineChannelAccessToken: "line-token",
      httpPost,
    });

    expect(httpPost).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      { channel: "google_chat", success: true },
      { channel: "line", success: true },
    ]);
    expect(httpPost.mock.calls[0][0]).toBe(settings.google_chat_webhook_url);
    expect(httpPost.mock.calls[1][0]).toBe(
      "https://api.line.me/v2/bot/message/push",
    );
  });
});
