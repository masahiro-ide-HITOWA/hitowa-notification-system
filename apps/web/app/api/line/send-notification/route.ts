import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";

export async function POST(request: Request) {
  try {
    const { portalUserId, messageText } = await request.json();

    if (!portalUserId || !messageText) {
      return NextResponse.json(
        { success: false, error: "portalUserId と messageText は必須です" },
        { status: 400 }
      );
    }

    const tableName = process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "portalUserId = :puid AND #st = :status",
        ExpressionAttributeNames: {
          "#st": "status",
        },
        ExpressionAttributeValues: {
          ":puid": portalUserId,
          ":status": "COMPLETED",
        },
      })
    );

    const targetUser = scanResult.Items?.[0];

    if (!targetUser || !targetUser.lineUserId) {
      return NextResponse.json(
        { success: false, error: "該当ユーザーの LINE 連携情報が見つかりません" },
        { status: 404 }
      );
    }

    const lineUserId = targetUser.lineUserId;
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
      return NextResponse.json(
        { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + channelAccessToken,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: messageText,
          },
        ],
      }),
    });

    if (!lineRes.ok) {
      const errorData = await lineRes.json();
      console.error("LINE Push Error:", errorData);
      return NextResponse.json(
        { success: false, error: "LINE へのメッセージ送信に失敗しました", details: errorData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "LINE プッシュ通知を送信しました",
      sentTo: lineUserId,
    });
  } catch (error) {
    console.error("Failed to send LINE notification:", error);
    return NextResponse.json(
      { success: false, error: "通知送信処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}