import {
  SendMessageCommand,
  SQSClient,
  type SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

import type { NotificationPayload } from "../models/notification";
import { validateNotificationPayload } from "../validators/notificationPayload";

const JSON_HEADERS = { "Content-Type": "application/json" };

export type ReceiveNotificationDependencies = {
  sqsClient: SQSClient;
  queueUrl: string;
  sendMessage?: (
    client: SQSClient,
    queueUrl: string,
    payload: NotificationPayload,
  ) => Promise<SendMessageCommandOutput>;
};

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function parseRequestBody(event: APIGatewayProxyEvent): unknown {
  if (event.body === null || event.body === undefined || event.body === "") {
    return null;
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(rawBody) as unknown;
}

async function defaultSendMessage(
  client: SQSClient,
  queueUrl: string,
  payload: NotificationPayload,
): Promise<SendMessageCommandOutput> {
  return client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  );
}

export function createReceiveNotificationHandler(
  deps: ReceiveNotificationDependencies,
) {
  const sendMessage = deps.sendMessage ?? defaultSendMessage;

  return async (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> => {
    if (!deps.queueUrl) {
      console.error("NOTIFICATION_QUEUE_URL is not configured");
      return jsonResponse(500, { message: "Internal server error" });
    }

    let parsedBody: unknown;
    try {
      parsedBody = parseRequestBody(event);
    } catch {
      return jsonResponse(400, { errors: ["Request body must be valid JSON"] });
    }

    const validation = validateNotificationPayload(parsedBody);
    if (!validation.ok) {
      return jsonResponse(400, { errors: validation.errors });
    }

    try {
      await sendMessage(deps.sqsClient, deps.queueUrl, validation.payload);
    } catch (error) {
      console.error("Failed to enqueue notification", error);
      return jsonResponse(500, { message: "Failed to enqueue notification" });
    }

    return jsonResponse(202, { message: "Accepted" });
  };
}

/** API Gateway POST 受付 Lambda のエントリポイント */
export const handler = createReceiveNotificationHandler({
  sqsClient: new SQSClient({}),
  queueUrl: process.env.NOTIFICATION_QUEUE_URL ?? "",
});
