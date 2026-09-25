import { NextResponse } from "next/server";
import { loadNotificationsForUser } from "@/lib/notification-store";
import { parseNotificationsPortalUserId } from "@/lib/notifications";
import {
  buildNotificationFeed,
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  parseNotificationFilter,
  parsePositiveInt,
} from "@/lib/notification-query";

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

  const filter = parseNotificationFilter(searchParams.get("filter"));
  const page = parsePositiveInt(searchParams.get("page"), 1, 10_000);
  const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_NOTIFICATION_PAGE_SIZE, 50);
  const notifications = await loadNotificationsForUser(portalUserId);
  return NextResponse.json(buildNotificationFeed(notifications, filter, page, limit));
}
