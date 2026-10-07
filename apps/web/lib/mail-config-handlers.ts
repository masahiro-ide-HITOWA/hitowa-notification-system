import { NextResponse } from "next/server";
import { parseMailSettingsActor, type MailConfigInput } from "@/lib/mail-config";
import {
  KAGOYA_IMAP_PORT,
  KAGOYA_MAIL_HOST,
  KAGOYA_SMTP_PORT,
  kagoyaAccountId,
} from "@/lib/mail-config-defaults";
import { MAIL_CONFIG_SAVED_MESSAGE } from "@/lib/mail-config-client";
import {
  getMailConfig,
  resolveMailConfigPlaintext,
  saveMailConfig,
} from "@/lib/mail-config-store";
import { MailConfigVerifyError, verifyMailConnection } from "@/lib/mail-config-verify";
import { canUseWebMail } from "@/lib/mail-permission";
import { mailActorFromRequest } from "@/lib/mail-api";

function actorFromRequest(
  request: Request,
  body: unknown,
  queryUserId: string | null
): { portalUserId: string; email: string } | null {
  const sessionActor = mailActorFromRequest(request);
  return parseMailSettingsActor(
    body,
    request.headers.get("x-user-id") ?? sessionActor.portalUserId,
    request.headers.get("x-user-email") ?? sessionActor.email,
    queryUserId
  ) ?? sessionActor;
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, message: "※本部社員はWebメール機能の対象外です" },
    { status: 403 }
  );
}

function passwordFromBody(body: unknown): string {
  if (typeof body !== "object" || body === null || !("password" in body)) {
    return "";
  }
  const password = (body as { password?: unknown }).password;
  return typeof password === "string" ? password : "";
}

function kagoyaConfigFromEmail(email: string, body: unknown): MailConfigInput | null {
  const username = kagoyaAccountId(email);
  if (!username) {
    return null;
  }
  return {
    imapHost: KAGOYA_MAIL_HOST,
    imapPort: KAGOYA_IMAP_PORT,
    smtpHost: KAGOYA_MAIL_HOST,
    smtpPort: KAGOYA_SMTP_PORT,
    username,
    password: passwordFromBody(body),
  };
}

export async function handleMailConfigGet(request: Request): Promise<NextResponse> {
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
    console.error("[mail-config] GET failed", error);
    return NextResponse.json(
      { success: false, message: "メール設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function handleMailConfigSave(request: Request): Promise<NextResponse> {
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

  const config = kagoyaConfigFromEmail(actor.email, body);
  if (!config) {
    return NextResponse.json(
      { success: false, message: "メールアドレスからアカウントIDを作成できません" },
      { status: 400 }
    );
  }

  try {
    const saved = await saveMailConfig(actor.portalUserId, config);
    return NextResponse.json({
      success: true,
      message: MAIL_CONFIG_SAVED_MESSAGE,
      config: saved,
    });
  } catch (error) {
    console.error("[mail-config] SAVE failed", error);
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

export async function handleMailConfigTest(request: Request): Promise<NextResponse> {
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

  const config = kagoyaConfigFromEmail(actor.email, body);
  if (!config) {
    return NextResponse.json(
      { success: false, message: "メールアドレスからアカウントIDを作成できません" },
      { status: 400 }
    );
  }

  try {
    const forTest = await resolveMailConfigPlaintext(actor.portalUserId, config);
    await verifyMailConnection(forTest);
    return NextResponse.json({
      success: true,
      message: "メールサーバーへの接続に成功しました",
    });
  } catch (error) {
    console.error("[mail-config] connection test failed", error);
    if (error instanceof Error && error.message === "password is required") {
      return NextResponse.json(
        { success: false, message: "メールパスワードは必須です" },
        { status: 400 }
      );
    }
    if (error instanceof MailConfigVerifyError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, message: "メール接続テストに失敗しました" },
      { status: 500 }
    );
  }
}
