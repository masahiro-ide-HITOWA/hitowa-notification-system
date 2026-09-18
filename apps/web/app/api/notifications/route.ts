import { NextResponse } from "next/server";
import { loadNotificationsForUser } from "@/lib/notification-store";
import { parseNotificationsPortalUserId } from "@/lib/notifications";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portalUserId = parseNotificationsPortalUserId(
    request.headers.get("x-user-id"),
    searchParams.get("portalUserId")
  );

  if (!portalUserId) {
    return NextResponse.json(
      { success: false, message: "portalUserId が指定されていません" },
      { status: 400 }
    );
  }

  const notifications = await loadNotificationsForUser(portalUserId);
  return NextResponse.json(notifications);
}
