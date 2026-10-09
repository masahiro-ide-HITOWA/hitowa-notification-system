import { NextResponse, type NextRequest } from "next/server";
import { clearedSessionRedirect, loggedOutUrl } from "@/lib/session-logout";

async function logoutResponse(request: NextRequest): Promise<NextResponse> {
  return clearedSessionRedirect(request, loggedOutUrl(request));
}

export async function GET(request: NextRequest) {
  return logoutResponse(request);
}

export async function POST(request: NextRequest) {
  return logoutResponse(request);
}
