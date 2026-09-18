import { NextResponse } from "next/server";
import { parseMailConfigInput, parseMailSettingsActor } from "@/lib/mail-config";
import { getMailConfig, saveMailConfig } from "@/lib/mail-config-store";
import { canUseWebMail } from "@/lib/mail-permission";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

function actorFromRequest(
  request: Request,
  body: unknown,
  queryUserId: string | null
): { portalUserId: string; email: string } | null {
  return parseMailSettingsActor(
    body,
    request.headers.get("x-user-id") ?? DEMO_USER_PROFILE.portalUserId,
    request.headers.get("x-user-email") ?? DEMO_USER_PROFILE.email,
    queryUserId
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, message: "※本部社員はWebメール機能の対象外です" },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const actor = actorFromRequest(request, {}, searchParams.get("portalUserId"));
  if (!actor) {
    return NextResponse.json(
      { success: false, message: "portalUserId が指定されていません" },
      { status: 400 }
    );
  }
  if (!canUseWebMail(actor.email)) {
    return forbiddenResponse();
  }

  try {
    const config = await getMailConfig(actor.portalUserId);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[mail-settings] GET failed", error);
    return NextResponse.json(
      { success: false, message: "メール設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const actor = actorFromRequest(request, body, null);
  if (!actor) {
    return NextResponse.json(
      { success: false, message: "portalUserId が指定されていません" },
      { status: 400 }
    );
  }
  if (!canUseWebMail(actor.email)) {
    return forbiddenResponse();
  }

  const config = parseMailConfigInput(body);
  if (!config) {
    return NextResponse.json(
      { success: false, message: "IMAP/SMTP の設定項目が不足しています" },
      { status: 400 }
    );
  }

  try {
    const saved = await saveMailConfig(actor.portalUserId, config);
    return NextResponse.json({
      success: true,
      message: "メール接続設定を保存しました",
      config: saved,
    });
  } catch (error) {
    console.error("[mail-settings] POST failed", error);
    if (error instanceof Error && error.message === "password is required") {
      return NextResponse.json(
        { success: false, message: "メールパスワードは必須です" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "メール設定の保存に失敗しました" },
      { status: 500 }
    );
  }
}
