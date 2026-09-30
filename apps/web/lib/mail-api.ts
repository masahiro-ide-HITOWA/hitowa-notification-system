import { NextResponse } from "next/server";
import { isMailImapError, type MailImapError } from "@/lib/mail-imap-model";
import { canUseWebMail } from "@/lib/mail-permission";
import { parseMailSettingsActor } from "@/lib/mail-config";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";
import { resolvePortalUser, sessionCookieFromHeader } from "@/lib/auth-session";

export function mailActorFromRequest(request: Request): { portalUserId: string; email: string } {
  const sessionUser = resolvePortalUser(sessionCookieFromHeader(request.headers.get("cookie")));
  return (
    parseMailSettingsActor(
      {},
      request.headers.get("x-user-id") ?? sessionUser?.portalUserId ?? DEMO_USER_PROFILE.portalUserId,
      request.headers.get("x-user-email") ?? sessionUser?.email ?? DEMO_USER_PROFILE.email,
      new URL(request.url).searchParams.get("portalUserId")
    ) ?? {
      portalUserId: sessionUser?.portalUserId ?? DEMO_USER_PROFILE.portalUserId,
      email: sessionUser?.email ?? DEMO_USER_PROFILE.email,
    }
  );
}

export function mailForbiddenIfHq(email: string): NextResponse | null {
  if (canUseWebMail(email)) {
    return null;
  }
  return NextResponse.json(
    { success: false, message: "※本部社員はWebメール機能の対象外です" },
    { status: 403 }
  );
}

export function mailImapErrorResponse(error: unknown): NextResponse {
  if (isMailImapError(error)) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: statusForMailError(error) }
    );
  }
  console.error("[mail-imap] unexpected error", error);
  return NextResponse.json(
    { success: false, message: "メールの取得に失敗しました" },
    { status: 500 }
  );
}

function statusForMailError(error: MailImapError): number {
  if (error.code === "CONFIG_MISSING" || error.code === "NOT_FOUND") {
    return 404;
  }
  if (error.code === "CONNECTION_FAILED") {
    return 502;
  }
  return 500;
}
