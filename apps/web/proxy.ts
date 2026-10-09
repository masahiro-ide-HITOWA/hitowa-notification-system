import type { NextRequest } from "next/server";
import { runAuthProxy } from "@/lib/auth-proxy";

export function proxy(request: NextRequest) {
  return runAuthProxy(request);
}

export const config = {
  matcher: [
    "/",
    "/mypage",
    "/mypage/:path*",
    "/settings",
    "/settings/:path*",
    "/notifications",
    "/notifications/:path*",
    "/mail",
    "/mail/:path*",
    "/saas/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
