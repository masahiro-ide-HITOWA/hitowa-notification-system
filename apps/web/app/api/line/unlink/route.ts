import { NextResponse } from "next/server";
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import { mappingOneTimeCodes, parseUnlinkPortalUserId } from "@/lib/line-unlink";

const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

export async function POST(request: Request) {
  try {
    const headerUserId = request.headers.get("x-user-id");
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      // JSON body が無い場合はヘッダーのみで判定
    }

    const portalUserId = parseUnlinkPortalUserId(body, headerUserId);
    if (!portalUserId) {
      return NextResponse.json(
        { success: false, message: "portalUserId が指定されていません" },
        { status: 400 }
      );
    }

    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "portalUserId = :puid AND #st = :status",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":puid": portalUserId,
          ":status": "COMPLETED",
        },
      })
    );

    const codes = mappingOneTimeCodes(scanResult.Items);
    if (codes.length === 0) {
      return NextResponse.json(
        { success: false, message: "連携済みのLINEアカウントが見つかりません" },
        { status: 404 }
      );
    }

    const unlinkedAt = new Date().toISOString();
    await Promise.all(
      codes.map((oneTimeCode) =>
        docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { oneTimeCode },
            UpdateExpression: "SET #st = :unlinked, unlinkedAt = :unlinkedAt",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
              ":unlinked": "UNLINKED",
              ":unlinkedAt": unlinkedAt,
            },
          })
        )
      )
    );

    return NextResponse.json({
      success: true,
      message: "LINE連携を解除しました",
    });
  } catch (error) {
    console.error("Failed to unlink LINE mapping:", error);
    return NextResponse.json(
      { success: false, message: "LINE連携の解除に失敗しました" },
      { status: 500 }
    );
  }
}
