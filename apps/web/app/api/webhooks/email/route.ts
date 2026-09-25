import { NextResponse } from "next/server";
import { parseEmailNotification } from "@/lib/email-parser";
import { ingestParsedEmailNotification } from "@/lib/email-ingest";
import { isDynamoTableMissing, logEmailWebhookError } from "@/lib/email-notification";

async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch (error) {
    logEmailWebhookError("[email webhook] JSON parse failed", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body === null) {
      return NextResponse.json(
        { success: false, message: "JSON ペイロードを解析できません" },
        { status: 400 }
      );
    }

    const parsed = parseEmailNotification(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const ingested = await ingestParsedEmailNotification(parsed.notification);
    if (!ingested.ok) {
      return NextResponse.json(
        {
          success: false,
          message: ingested.message,
          ...(ingested.table ? { table: ingested.table } : {}),
        },
        { status: ingested.status }
      );
    }

    return NextResponse.json({ success: true, notificationId: ingested.notificationId });
  } catch (error) {
    logEmailWebhookError("[email webhook] unhandled error", error);
    if (isDynamoTableMissing(error)) {
      return NextResponse.json(
        { success: false, message: "DynamoDB テーブルが存在しません" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: "メール通知の取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
