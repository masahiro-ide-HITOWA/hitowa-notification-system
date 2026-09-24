import { NextResponse } from "next/server";
import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { parseIssueCodeRequest } from "@/lib/saml-user-attributes";

const tableName =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

// --- GET: ステータス確認ハンドラ ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const portalUserId = searchParams.get("portalUserId") || request.headers.get("x-user-id");

    if (!code && !portalUserId) {
      return NextResponse.json(
        { success: false, error: "code または portalUserId が必要です" },
        { status: 400 }
      );
    }

    let item = null;

    // 1. code から取得を試みる (ワンタイムコード検索)
    if (code) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "oneTimeCode-index", // インデックスがある場合の検索
          KeyConditionExpression: "oneTimeCode = :code",
          ExpressionAttributeValues: { ":code": code },
        })
      ).catch(() => null);

      if (result?.Items && result.Items.length > 0) {
        item = result.Items[0];
      }
    }

    // 2. email / portalUserId からのフォールバック取得
    if (!item && portalUserId) {
      const email = portalUserId.includes("@") ? portalUserId : `${portalUserId}@example.com`;
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { email: email },
        })
      ).catch(() => null);

      if (result?.Item) {
        item = result.Item;
      }
    }

    return NextResponse.json({
      success: true,
      status: item?.status || "UNLINKED",
      lineUserId: item?.lineUserId || null,
      updatedAt: item?.updatedAt || item?.createdAt || null,
    });
  } catch (error: any) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ステータス確認に失敗しました",
        debugMessage: error?.message || String(error),
        debugName: error?.name,
        debugCode: error?.$metadata?.httpStatusCode,
        debugStack: error?.stack,
      },
      { status: 500 }
    );
  }
}

// --- POST: ワンタイムコード発行ハンドラ ---
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

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          email: email, // 必須キー email
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
        debugStack: error?.stack,
      },
      { status: 500 }
    );
  }
}