import { SQSClient, type SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NotificationPayload } from "../models/notification";
export type ReceiveNotificationDependencies = {
    sqsClient: SQSClient;
    queueUrl: string;
    sendMessage?: (client: SQSClient, queueUrl: string, payload: NotificationPayload) => Promise<SendMessageCommandOutput>;
};
export declare function createReceiveNotificationHandler(deps: ReceiveNotificationDependencies): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
/** API Gateway POST 受付 Lambda のエントリポイント */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
