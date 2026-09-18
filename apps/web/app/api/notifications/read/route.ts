import { NextResponse } from "next/server";
import {
  markNotificationAsRead,
  parseMarkReadRequest,
} from "@/lib/notification-read";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "JSON ペイロードを解析できません" },
      { status: 400 }
    );
  }

  const parsed = parseMarkReadRequest(body, request.headers.get("x-user-id"));
  if (!parsed) {
    return NextResponse.json(
      { success: false, message: "id と portalUserId は必須です" },
      { status: 400 }
    );
  }

  const result = await markNotificationAsRead(parsed.id, parsed.portalUserId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, id: result.id });
}
