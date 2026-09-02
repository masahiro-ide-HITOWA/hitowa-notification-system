"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.createReceiveNotificationHandler = createReceiveNotificationHandler;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const notificationPayload_1 = require("../validators/notificationPayload");
const JSON_HEADERS = { "Content-Type": "application/json" };
function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
    };
}
function parseRequestBody(event) {
    if (event.body === null || event.body === undefined || event.body === "") {
        return null;
    }
    const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
    return JSON.parse(rawBody);
}
async function defaultSendMessage(client, queueUrl, payload) {
    return client.send(new client_sqs_1.SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payload),
    }));
}
function createReceiveNotificationHandler(deps) {
    const sendMessage = deps.sendMessage ?? defaultSendMessage;
    return async (event) => {
        if (!deps.queueUrl) {
            console.error("NOTIFICATION_QUEUE_URL is not configured");
            return jsonResponse(500, { message: "Internal server error" });
        }
        let parsedBody;
        try {
            parsedBody = parseRequestBody(event);
        }
        catch {
            return jsonResponse(400, { errors: ["Request body must be valid JSON"] });
        }
        const validation = (0, notificationPayload_1.validateNotificationPayload)(parsedBody);
        if (!validation.ok) {
            return jsonResponse(400, { errors: validation.errors });
        }
        try {
            await sendMessage(deps.sqsClient, deps.queueUrl, validation.payload);
        }
        catch (error) {
            console.error("Failed to enqueue notification", error);
            return jsonResponse(500, { message: "Failed to enqueue notification" });
        }
        return jsonResponse(202, { message: "Accepted" });
    };
}
/** API Gateway POST 受付 Lambda のエントリポイント */
exports.handler = createReceiveNotificationHandler({
    sqsClient: new client_sqs_1.SQSClient({}),
    queueUrl: process.env.NOTIFICATION_QUEUE_URL ?? "",
});
