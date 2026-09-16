import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";

export async function POST() {
  try {
    const userId = "test-user-001";
    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const ttlSeconds = Math.floor(now.getTime() / 1000) + (10 * 60);

    const tableName = process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          oneTimeCode: oneTimeCode,
          portalUserId: userId,
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
      expiresAt,
      lineAddFriendUrl: https://line.me/R/ti/p/ + process.env.LINE_BOT_BASIC_ID,
    });
  } catch (error) {
    console.error("Failed to issue one-time code:", error);
    return NextResponse.json(
      { success: false, error: "コードの発行に失敗しました" },
      { status: 500 }
    );
  }
}
