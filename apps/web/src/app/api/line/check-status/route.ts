import { NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ success: false, error: "Code is required" }, { status: 400 });
  }

  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { oneTimeCode: code },
      })
    );

    const item = result.Item;
    if (!item) {
      return NextResponse.json({ success: false, status: "NOT_FOUND" });
    }

    const isCompleted = item.status === "COMPLETED" || !!item.lineUserId;

    return NextResponse.json({
      success: true,
      status: isCompleted ? "COMPLETED" : "PENDING",
      lineUserId: item.lineUserId || null,
    });
  } catch (error) {
    console.error("Failed to check status:", error);
    return NextResponse.json({ success: false, error: "ステータス確認に失敗しました" }, { status: 500 });
  }
}
