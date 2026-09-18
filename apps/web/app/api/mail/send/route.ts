import { NextResponse } from "next/server";
import { parseMailSettingsActor } from "@/lib/mail-config";
import { mailForbiddenIfHq } from "@/lib/mail-api";
import { sendMail } from "@/lib/mail-smtp";
import { isMailSmtpError, parseSendMailPayload } from "@/lib/mail-smtp-model";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const actor =
    parseMailSettingsActor(
      body,
      request.headers.get("x-user-id") ?? DEMO_USER_PROFILE.portalUserId,
      request.headers.get("x-user-email") ?? DEMO_USER_PROFILE.email,
      null
    ) ?? {
      portalUserId: DEMO_USER_PROFILE.portalUserId,
      email: DEMO_USER_PROFILE.email,
    };

  const forbidden = mailForbiddenIfHq(actor.email);
  if (forbidden) {
    return forbidden;
  }

  const payload = parseSendMailPayload(body);
  if (!payload) {
    return NextResponse.json(
      { success: false, code: "VALIDATION_FAILED", message: "宛先・件名・本文は必須です" },
      { status: 400 }
    );
  }

  try {
    const result = await sendMail(actor.portalUserId, payload);
    return NextResponse.json(result);
  } catch (error) {
    if (isMailSmtpError(error)) {
      const status =
        error.code === "CONFIG_MISSING"
          ? 404
          : error.code === "AUTH_FAILED"
            ? 401
            : error.code === "VALIDATION_FAILED"
              ? 400
              : 502;
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status }
      );
    }
    console.error("[mail-send] unexpected error", error);
    return NextResponse.json(
      { success: false, message: "メールの送信に失敗しました" },
      { status: 500 }
    );
  }
}
