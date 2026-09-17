import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";

export async function POST(request: Request) {
  try {
    const headerUserId = request.headers.get("x-user-id");
    let bodyData: any = {};
    
    try {
      bodyData = await request.json();
    } catch {
      // JSON body が無い場合は無視
    }

    const userId = headerUserId || bodyData?.portalUserId || "00400611";

    // SAML由来の属性情報
    const userAttributes = bodyData?.attributes || {
      name: "姓 名",
      email: "mei-sei@hitowa.com",
      companyCode: "100",
      companyName: "株式会社HITOWA",
      divisionName: "情報システム部企画統制課",
      officeCode: "1",
      positionCode: "1570",
      employmentCode: "1"
    };

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
          attributes: userAttributes, // 施設絞り込み配信等で活用する属性情報
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
      portalUserId: userId,
      expiresAt,
      lineAddFriendUrl: "https://line.me/R/ti/p/" + (process.env.LINE_BOT_BASIC_ID || ""),
    });
  } catch (error) {
    console.error("Failed to issue one-time code:", error);
    return NextResponse.json(
      { success: false, error: "コードの発行に失敗しました" },
      { status: 500 }
    );
  }
}