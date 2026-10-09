import { NextResponse } from "next/server";
import { portalOriginFromEnv } from "@/lib/deploy-env";

const ALLOW_HEADERS = "Content-Type, Accept";
const ALLOW_METHODS = "GET, OPTIONS";

export function applyPortalCors(request: Request, response: NextResponse): NextResponse {
  const allowed = portalOriginFromEnv();
  const origin = request.headers.get("origin")?.trim() ?? "";
  if (!allowed || origin !== allowed) {
    return response;
  }
  response.headers.set("Access-Control-Allow-Origin", allowed);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  response.headers.set("Vary", "Origin");
  return response;
}

export function portalPreflight(request: Request): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyPortalCors(request, response);
}
