import type { UserChannelSettings } from "../models/channelSettings";
import type {
  ChannelSendResult,
  NotificationPayload,
  PushChannel,
} from "../models/notification";

export type HttpPostFn = (
  url: string,
  init: { headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text: string }>;

export type ChannelPushConfig = {
  lineChannelAccessToken: string;
  httpPost?: HttpPostFn;
};

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function formatMessage(payload: NotificationPayload): string {
  return `${payload.title}\n${payload.body}\n${payload.action_url}`;
}

async function defaultHttpPost(
  url: string,
  init: { headers: Record<string, string>; body: string },
): Promise<{ ok: boolean; status: number; text: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: init.headers,
    body: init.body,
  });
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

async function postJson(
  httpPost: HttpPostFn,
  url: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<void> {
  const result = await httpPost(url, {
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}: ${result.text}`);
  }
}

export async function sendToEnabledChannels(
  payload: NotificationPayload,
  settings: UserChannelSettings,
  config: ChannelPushConfig,
): Promise<ChannelSendResult[]> {
  const httpPost = config.httpPost ?? defaultHttpPost;
  const message = formatMessage(payload);
  const tasks: Array<{ channel: PushChannel; run: () => Promise<void> }> = [];

  if (settings.google_chat) {
    tasks.push({
      channel: "google_chat",
      run: async () => {
        if (!settings.google_chat_webhook_url) {
          throw new Error("google_chat_webhook_url is not set");
        }
        await postJson(httpPost, settings.google_chat_webhook_url, {
          text: message,
        });
      },
    });
  }

  if (settings.line) {
    tasks.push({
      channel: "line",
      run: async () => {
        if (!settings.line_user_id) {
          throw new Error("line_user_id is not set");
        }
        if (!config.lineChannelAccessToken) {
          throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
        }
        await postJson(
          httpPost,
          LINE_PUSH_URL,
          {
            to: settings.line_user_id,
            messages: [{ type: "text", text: message }],
          },
          { Authorization: `Bearer ${config.lineChannelAccessToken}` },
        );
      },
    });
  }

  if (settings.slack) {
    tasks.push({
      channel: "slack",
      run: async () => {
        if (!settings.slack_webhook_url) {
          throw new Error("slack_webhook_url is not set");
        }
        await postJson(httpPost, settings.slack_webhook_url, { text: message });
      },
    });
  }

  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  return settled.map((result, index) => {
    const channel = tasks[index].channel;
    if (result.status === "fulfilled") {
      return { channel, success: true };
    }
    const reason = result.reason;
    const error = reason instanceof Error ? reason.message : String(reason);
    return { channel, success: false, error };
  });
}
