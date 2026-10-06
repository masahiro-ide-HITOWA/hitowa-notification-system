import { NextResponse } from "next/server";
import { getSamlClient, isMockAuthEnabled, SAML_CALLBACK_PATH } from "@/lib/saml";
import { hostnameFromRequest } from "@/lib/auth-mode";
import { absoluteUrlFromRequest, resolveRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  if (isMockAuthEnabled(process.env, hostnameFromRequest(request))) {
    return NextResponse.redirect(absoluteUrlFromRequest("/", request));
  }
  try {
    const saml = getSamlClient();
    const relayState = new URL(request.url).searchParams.get("RelayState") ?? "";
    const host = new URL(resolveRequestOrigin(request)).host;
    const redirectUrl = await saml.getAuthorizeUrlAsync(relayState, host, { forceAuthn: true });
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[saml] failed to start login", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "SAML ログインを開始できません",
        callbackPath: SAML_CALLBACK_PATH,
      },
      { status: 503 }
    );
  }
}
