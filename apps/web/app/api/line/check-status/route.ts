import { NextResponse } from "next/server";
import { pendingLineStatus, readLineLinkStatus } from "@/lib/line-mapping-lookup";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const email =
      searchParams.get("email") ??
      request.headers.get("x-user-email");
    const portalUserId =
      searchParams.get("portalUserId") ?? request.headers.get("x-user-id");

    const status = await readLineLinkStatus({ code, email, portalUserId });
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to check status:", error);
    return NextResponse.json(pendingLineStatus());
  }
}
