import { NextResponse } from "next/server";
import { sessionCookieFromHeader } from "@/lib/auth-session";
import { hostnameFromRequest } from "@/lib/auth-mode";
import { resolveGuardedPortalUser } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const hostname = hostnameFromRequest(request);
  const token = sessionCookieFromHeader(request.headers.get("cookie"));
  const user = resolveGuardedPortalUser(token, hostname);
  const authMode = "saml";
  return NextResponse.json(
    {
      success: true,
      authMode,
      user,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
