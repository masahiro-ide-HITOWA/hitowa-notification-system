import { NextResponse } from "next/server";
import { fetchMailList } from "@/lib/mail-imap";
import { normalizeMailFolder, parseMailLimit } from "@/lib/mail-imap-model";
import { mailActorFromRequest, mailForbiddenIfHq, mailImapErrorResponse } from "@/lib/mail-api";

export async function GET(request: Request) {
  const actor = mailActorFromRequest(request);
  const forbidden = mailForbiddenIfHq(actor.email);
  if (forbidden) {
    return forbidden;
  }

  const { searchParams } = new URL(request.url);
  const folder = normalizeMailFolder(searchParams.get("folder"));
  const limit = parseMailLimit(searchParams.get("limit"));

  try {
    const messages = await fetchMailList(actor.portalUserId, folder, limit);
    return NextResponse.json({ success: true, folder, messages });
  } catch (error) {
    return mailImapErrorResponse(error);
  }
}
