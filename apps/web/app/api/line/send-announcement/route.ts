import { NextResponse } from "next/server";
import { ScanCommand, type NativeAttributeValue } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/dynamodb";
import {
  createLineMulticastSender,
  extractAnnouncementRecipients,
  formatAnnouncementMessage,
  parseAnnouncementRequest,
  sendAnnouncementMulticast,
  buildAnnouncementScanFilter,
  type AnnouncementRequest,
} from "@/lib/line-announcement";

const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_USER_TABLE || "HitowaUserMappings";

async function scanAnnouncementTargets(request: AnnouncementRequest): Promise<unknown[]> {
  const filter = buildAnnouncementScanFilter(request);
  const items: unknown[] = [];
  let exclusiveStartKey: Record<string, NativeAttributeValue> | undefined;

  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ...filter,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );
    if (page.Items) {
      items.push(...page.Items);
    }
    exclusiveStartKey = page.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export async function POST(request: Request) {
  try {
    const parsed = parseAnnouncementRequest(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
      return NextResponse.json(
        { success: false, message: "LINE_CHANNEL_ACCESS_TOKEN が設定されていません" },
        { status: 500 }
      );
    }

    const items = await scanAnnouncementTargets(parsed.request);
    const lineUserIds = extractAnnouncementRecipients(
      items,
      parsed.request.targetType,
      parsed.request.officeCode
    );
    const text = formatAnnouncementMessage(parsed.request.title, parsed.request.content);
    const count = await sendAnnouncementMulticast(
      lineUserIds,
      text,
      createLineMulticastSender(channelAccessToken, fetch)
    );

    return NextResponse.json({
      success: count === lineUserIds.length,
      count,
      targetType: parsed.request.targetType,
      officeCode: parsed.request.officeCode ?? null,
    });
  } catch (error) {
    console.error("Failed to send LINE announcement:", error);
    return NextResponse.json(
      { success: false, message: "お知らせのLINE配信に失敗しました" },
      { status: 500 }
    );
  }
}
