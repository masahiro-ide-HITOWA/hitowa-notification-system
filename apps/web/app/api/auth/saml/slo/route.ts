import { NextResponse, type NextRequest } from "next/server";
import { clearedSessionRedirect, sloRedirectUrl } from "@/lib/session-logout";

async function sloResponse(request: NextRequest): Promise<NextResponse> {
  return clearedSessionRedirect(request, sloRedirectUrl(request));
}

export async function GET(request: NextRequest) {
  return sloResponse(request);
}

export async function POST(request: NextRequest) {
  return sloResponse(request);
}
