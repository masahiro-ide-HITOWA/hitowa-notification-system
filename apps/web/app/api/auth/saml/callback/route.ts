import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth-session";
import { getSamlClient, isMockAuthEnabled } from "@/lib/saml";
import { profileFromSamlAttributes, samlBodyFromRequestData } from "@/lib/saml-profile";

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

    const user = profileFromSamlAttributes(result.profile);
    const response = NextResponse.redirect(new URL("/mypage", request.url));
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[saml] callback validation failed", error);
    return NextResponse.json(
      { success: false, message: "SAML Response の検証に失敗しました" },
      { status: 401 }
    );
  }
}
