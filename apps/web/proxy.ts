import type { NextRequest } from "next/server";
import { authProxyConfig, runAuthProxy } from "@/lib/auth-proxy";

/** Next.js 16: middleware.ts は非推奨。本体は proxy.ts で実行される。 */
export function proxy(request: NextRequest) {
  console.log("[MIDDLEWARE CHECK]", request.nextUrl.pathname, "Cookies:", request.cookies.getAll());
  return runAuthProxy(request);
}

export const config = authProxyConfig;
