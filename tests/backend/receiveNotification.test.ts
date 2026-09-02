import type { SQSClient } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { createReceiveNotificationHandler } from "../../packages/backend/handlers/receiveNotification";
import type { NotificationPayload } from "../../packages/backend/models/notification";

const validPayload: NotificationPayload = {
  target_employee_id: "emp-001",
  source_system: "kaonavi",
  title: "勤怠未入力のお知らせ",
  body: "今月の勤怠入力が未完了です。",
  action_url: "https://example.com/notifications/1",
  category: "attendance",
};

function createEvent(body: unknown): APIGatewayProxyEvent {
  return {
    body: body === undefined ? null : JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/notifications",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

describe("createReceiveNotificationHandler", () => {
  it("returns 202 Accepted and enqueues a valid payload", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ MessageId: "msg-1" });
    const handler = createReceiveNotificationHandler({
      sqsClient: {} as SQSClient,
      queueUrl: "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      sendMessage,
    });

    const response = await handler(createEvent(validPayload));

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ message: "Accepted" });
    expect(sendMessage).toHaveBeenCalledWith(
      {},
      "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      validPayload,
    );
  });

  it("returns 400 when payload validation fails", async () => {
    const sendMessage = vi.fn();
    const handler = createReceiveNotificationHandler({
      sqsClient: {} as SQSClient,
      queueUrl: "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      sendMessage,
    });

    const response = await handler(
      createEvent({ ...validPayload, source_system: "unknown" }),
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).errors).toContain(
      "source_system must be one of: kaonavi, tokium, cloudhouse_labor",
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const handler = createReceiveNotificationHandler({
      sqsClient: {} as SQSClient,
      queueUrl: "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      sendMessage: vi.fn(),
    });

    const response = await handler({
      ...createEvent(validPayload),
      body: "{invalid",
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).errors).toContain(
      "Request body must be valid JSON",
    );
  });

  it("returns 500 when SQS enqueue fails", async () => {
    const handler = createReceiveNotificationHandler({
      sqsClient: {} as SQSClient,
      queueUrl: "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      sendMessage: vi.fn().mockRejectedValue(new Error("SQS unavailable")),
    });

    const response = await handler(createEvent(validPayload));

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Failed to enqueue notification",
    });
  });
});
