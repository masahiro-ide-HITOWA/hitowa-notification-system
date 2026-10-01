import type { NextRequest } from "next/server";
import { authProxyConfig, runAuthProxy } from "@/lib/auth-proxy";

export function proxy(request: NextRequest) {
  console.log("[MIDDLEWARE CHECK]", request.nextUrl.pathname, "Cookies:", request.cookies.getAll());
  return runAuthProxy(request);
}

export const config = authProxyConfig;
