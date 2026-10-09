import { NextResponse } from "next/server";
import { sessionCookieFromHeader, verifySessionToken } from "@/lib/auth-session";
import { countUnreadForUser } from "@/lib/notification-unread";
import { applyPortalCors, portalPreflight } from "@/lib/portal-cors";

export interface UnreadCountDeps {
  countUnread: (portalUserId: string) => Promise<number>;
}

function portalUserIdFromCookie(request: Request): string | null {
  const token = sessionCookieFromHeader(request.headers.get("cookie"));
  return verifySessionToken(token)?.portalUserId ?? null;
}

export async function handleUnreadCount(
  request: Request,
  deps: UnreadCountDeps = { countUnread: countUnreadForUser }
): Promise<NextResponse> {
  if (request.method === "OPTIONS") {
    return portalPreflight(request);
  }

  const portalUserId = portalUserIdFromCookie(request);
  if (!portalUserId) {
    return applyPortalCors(
      request,
      NextResponse.json({ success: false, message: "ログインが必要です" }, { status: 401 })
    );
  }

  try {
    const unreadCount = await deps.countUnread(portalUserId);
    return applyPortalCors(
      request,
      NextResponse.json({ success: true, unreadCount })
    );
  } catch (error) {
    console.error("[notifications] unread-count failed", error);
    return applyPortalCors(
      request,
      NextResponse.json(
        { success: false, message: "未読件数の取得に失敗しました" },
        { status: 500 }
      )
    );
  }
}

export async function GET(request: Request) {
  return handleUnreadCount(request);
}

export async function OPTIONS(request: Request) {
  return handleUnreadCount(request);
}
