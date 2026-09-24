import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { parseIssueCodeRequest } from "@/lib/saml-user-attributes";

export async function POST(request: Request) {
  try {
    const headerUserId = request.headers.get("x-user-id");
    let bodyData: unknown = {};

    try {
      bodyData = await request.json();
    } catch {
      // JSON body が無い場合は無視
    }

    const { portalUserId, attributes } = parseIssueCodeRequest(bodyData, headerUserId);

    // DynamoDBで必須となっている email キーを抽出・フォールバック作成
    const email =
      attributes?.email ||
      (portalUserId.includes("@") ? portalUserId : `${portalUserId || "user"}@example.com`);

    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const ttlSeconds = Math.floor(now.getTime() / 1000) + 10 * 60;

    const tableName =
      process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          email: email, // ★必須キー email を追加！
          oneTimeCode: oneTimeCode,
          portalUserId,
          attributes,
          status: "PENDING",
          createdAt: now.toISOString(),
          expiresAt: expiresAt,
          ttl: ttlSeconds,
        },
      })
    );

    return NextResponse.json({
      success: true,
      oneTimeCode,
      portalUserId,
      expiresAt,
      lineAddFriendUrl: "https://line.me/R/ti/p/" + (process.env.LINE_BOT_BASIC_ID || ""),
    });
  } catch (error: any) {
    console.error("Error issuing code:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "コードの発行に失敗しました",
        debugMessage: error?.message || String(error),
        debugName: error?.name,
        debugCode: error?.$metadata?.httpStatusCode,
        debugStack: error?.stack
      },
      { status: 500 }
    );
  }
}