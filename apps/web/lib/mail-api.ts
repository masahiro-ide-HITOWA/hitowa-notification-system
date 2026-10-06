import { NextResponse } from "next/server";
import { isMailImapError, type MailImapError } from "@/lib/mail-imap-model";
import { canUseWebMail } from "@/lib/mail-permission";
import { parseMailSettingsActor } from "@/lib/mail-config";
import { hostnameFromRequest } from "@/lib/auth-mode";
import { resolveGuardedPortalUser } from "@/lib/auth-guard";
import { sessionCookieFromHeader } from "@/lib/auth-session";

export function mailActorFromRequest(request: Request): { portalUserId: string; email: string } {
  const hostname = hostnameFromRequest(request);
  const sessionUser = resolveGuardedPortalUser(
    sessionCookieFromHeader(request.headers.get("cookie")),
    hostname
  );
  return (
    parseMailSettingsActor(
      {},
      request.headers.get("x-user-id") ?? sessionUser?.portalUserId ?? null,
      request.headers.get("x-user-email") ?? sessionUser?.email ?? null,
      new URL(request.url).searchParams.get("portalUserId")
    ) ?? {
      portalUserId: sessionUser?.portalUserId ?? "",
      email: sessionUser?.email ?? "",
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
