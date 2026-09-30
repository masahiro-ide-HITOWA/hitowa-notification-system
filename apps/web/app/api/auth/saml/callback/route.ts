import { NextResponse } from "next/server";
import { SAML_COMPLETE_PATH } from "@/lib/auth-mode";
import { getSamlClient, isMockAuthEnabled } from "@/lib/saml";
import { absoluteUrlFromRequest } from "@/lib/request-origin";
import { profileFromSamlAttributes, samlBodyFromRequestData } from "@/lib/saml-profile";
import { createSessionToken } from "@/lib/auth-session";

async function readCallbackBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  try {
    return await request.json();
  } catch {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
}

export async function POST(request: Request) {
  if (isMockAuthEnabled()) {
    return NextResponse.json(
      { success: false, message: "モック認証中のため SAML コールバックは無効です" },
      { status: 400 }
    );
  }

  try {
    const body = samlBodyFromRequestData(await readCallbackBody(request));
    if (!body) {
      return NextResponse.json(
        { success: false, message: "SAMLResponse が必要です" },
        { status: 400 }
      );
    }

    const result = await getSamlClient().validatePostResponseAsync(body);
    if (!result.profile) {
      return NextResponse.json(
        { success: false, message: "SAML プロファイルが空です" },
        { status: 401 }
      );
    }

    const token = createSessionToken(profileFromSamlAttributes(result.profile));
    const completeUrl = new URL(absoluteUrlFromRequest(SAML_COMPLETE_PATH, request));
    completeUrl.searchParams.set("t", token);
    const response = NextResponse.redirect(completeUrl, 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[saml] callback validation failed", error);
    return NextResponse.json(
      { success: false, message: "SAML Response の検証に失敗しました" },
      { status: 401 }
    );
  }
}
