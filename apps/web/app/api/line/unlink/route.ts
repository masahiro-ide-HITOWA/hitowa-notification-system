import { NextResponse } from "next/server";
import { parseUnlinkCode, parseUnlinkEmail, parseUnlinkPortalUserId } from "@/lib/line-unlink";
import { unlinkLineMapping } from "@/lib/line-mapping-unlink";

export async function POST(request: Request) {
  try {
    const headerUserId = request.headers.get("x-user-id");
    const headerEmail = request.headers.get("x-user-email");
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      // JSON body が無い場合はヘッダーのみで判定
    }

    const portalUserId = parseUnlinkPortalUserId(body, headerUserId);
    const email = parseUnlinkEmail(body, headerEmail);
    const code = parseUnlinkCode(body);
    if (!portalUserId && !email && !code) {
      return NextResponse.json(
        { success: false, message: "portalUserId または email が指定されていません" },
        { status: 400 }
      );
    }

    const result = await unlinkLineMapping({ portalUserId, email, code });
    if (!result.ok && result.reason === "not_found") {
      return NextResponse.json(
        { success: false, message: "連携済みのLINEアカウントが見つかりません" },
        { status: 404 }
      );
    }
    if (!result.ok && result.reason === "missing_email") {
      return NextResponse.json(
        { success: false, message: "対象レコードの email が特定できません" },
        { status: 400 }
      );
    }
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: "LINE連携の解除に失敗しました" },
        { status: 500 }
      );
    }

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
