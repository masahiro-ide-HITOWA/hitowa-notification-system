import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hostnameFromRequest, isMockAuthEnabled, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { verifySessionToken } from "@/lib/auth-session";

const MYPAGE_NAVIGATION_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0;url=/mypage">
  </head>
  <body>
    <script>window.location.href = '/mypage';</script>
  </body>
</html>
`;

const SESSION_COOKIE = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
};

async function sessionNavigationResponse(sessionToken: string): Promise<NextResponse> {
  const response = new NextResponse(MYPAGE_NAVIGATION_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });

  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE);
  } catch {
    // Route-handler unit tests have no Next.js cookie store.
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    ...SESSION_COOKIE,
  });
  return response;
}

export async function GET(request: Request) {
  if (isMockAuthEnabled(process.env, hostnameFromRequest(request))) {
    return NextResponse.json(
      { success: false, message: "モック認証中のため SAML セッション確定は無効です" },
      { status: 400 }
    );
  }

  const ticket = new URL(request.url).searchParams.get("t")?.trim() ?? "";
  if (ticket === "" || !verifySessionToken(ticket)) {
    return NextResponse.json(
      { success: false, message: "セッションチケットが無効です" },
      { status: 401 }
    );
  }

  return sessionNavigationResponse(ticket);
}
