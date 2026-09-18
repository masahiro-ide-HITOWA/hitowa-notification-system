import { NextResponse } from "next/server";
import { fetchMailDetail } from "@/lib/mail-imap";
import { normalizeMailFolder } from "@/lib/mail-imap-model";
import { mailActorFromRequest, mailForbiddenIfHq, mailImapErrorResponse } from "@/lib/mail-api";

interface UidRouteContext {
  params: Promise<{ uid: string }> | { uid: string };
}

export async function GET(request: Request, context: UidRouteContext) {
  const actor = mailActorFromRequest(request);
  const forbidden = mailForbiddenIfHq(actor.email);
  if (forbidden) {
    return forbidden;
  }

  const params = await Promise.resolve(context.params);
  const uid = Number(params.uid);
  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json(
      { success: false, code: "NOT_FOUND", message: "メールが見つかりません" },
      { status: 404 }
    );
  }

  const folder = normalizeMailFolder(new URL(request.url).searchParams.get("folder"));
  try {
    const message = await fetchMailDetail(actor.portalUserId, uid, folder);
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return mailImapErrorResponse(error);
  }
}
