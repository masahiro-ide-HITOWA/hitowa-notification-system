import type { SQSClient } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { createReceiveNotificationHandler } from "../packages/backend/handlers/receiveNotification";
import type { NotificationPayload } from "../packages/backend/models/notification";
import { validateNotificationPayload } from "../packages/backend/validators/notificationPayload";

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

function createHandler(sendMessage = vi.fn().mockResolvedValue({ MessageId: "msg-1" })) {
  return {
    sendMessage,
    handler: createReceiveNotificationHandler({
      sqsClient: {} as SQSClient,
      queueUrl: "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      sendMessage,
    }),
  };
}

describe("validateNotificationPayload", () => {
  it("accepts a complete payload from each source system", () => {
    for (const source_system of ["kaonavi", "tokium", "cloudhouse_labor"] as const) {
      const result = validateNotificationPayload({ ...validPayload, source_system });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects a non-object body", () => {
    expect(validateNotificationPayload(null).ok).toBe(false);
    expect(validateNotificationPayload("payload").ok).toBe(false);
  });

  it("rejects missing or empty required fields", () => {
    const requiredKeys: Array<keyof NotificationPayload> = [
      "target_employee_id",
      "title",
      "body",
      "action_url",
      "category",
    ];
    for (const key of requiredKeys) {
      const missing = validateNotificationPayload({ ...validPayload, [key]: "" });
      expect(missing.ok).toBe(false);
    }
  });

  it("rejects an unknown source_system", () => {
    const result = validateNotificationPayload({
      ...validPayload,
      source_system: "unknown",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        "source_system must be one of: kaonavi, tokium, cloudhouse_labor",
      );
    }
  });
});

describe("receiveNotification API", () => {
  it("returns 202 and enqueues a valid payload", async () => {
    const { handler, sendMessage } = createHandler();
    const response = await handler(createEvent(validPayload));

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ message: "Accepted" });
    expect(sendMessage).toHaveBeenCalledWith(
      {},
      "https://sqs.ap-northeast-1.amazonaws.com/123/queue",
      validPayload,
    );
  });

  it("returns 400 and does not enqueue when validation fails", async () => {
    const { handler, sendMessage } = createHandler(vi.fn());
    const response = await handler(
      createEvent({ ...validPayload, title: " ", source_system: "unknown" }),
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).errors.length).toBeGreaterThan(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("returns 400 when the request body is invalid JSON", async () => {
    const { handler, sendMessage } = createHandler(vi.fn());
    const response = await handler({ ...createEvent(validPayload), body: "{invalid" });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).errors).toContain(
      "Request body must be valid JSON",
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
