import { NextResponse } from "next/server";
import { getSamlClient, MissingSamlEnvError, SAML_CALLBACK_PATH } from "@/lib/saml";
import { resolveRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  try {
    const saml = getSamlClient();
    const relayState = new URL(request.url).searchParams.get("RelayState") ?? "";
    const host = new URL(resolveRequestOrigin(request)).host;
    const redirectUrl = await saml.getAuthorizeUrlAsync(relayState, host, { forceAuthn: true });
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[saml] failed to start login", error);
    if (error instanceof MissingSamlEnvError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          missingKeys: error.missingKeys,
        },
        { status: 503 }
      );
    }
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
