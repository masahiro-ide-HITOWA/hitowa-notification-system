import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// 明示的に ap-northeast-1 を指定（Amplify Hosting SSR 環境用）
const region = process.env.AWS_REGION || "ap-northeast-1";

const client = new DynamoDBClient({
  region: region,
});

export const docClient = DynamoDBDocumentClient.from(client);