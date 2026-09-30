import { NextResponse } from "next/server";
import { getSamlClient, isMockAuthEnabled, SAML_CALLBACK_PATH } from "@/lib/saml";

export async function GET(request: Request) {
  if (isMockAuthEnabled()) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  try {
    const saml = getSamlClient();
    const relayState = new URL(request.url).searchParams.get("RelayState") ?? "";
    const redirectUrl = await saml.getAuthorizeUrlAsync(relayState, undefined, {});
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
