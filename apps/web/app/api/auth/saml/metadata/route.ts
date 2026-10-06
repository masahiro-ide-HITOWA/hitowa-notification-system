import { NextResponse } from "next/server";
import { hostnameFromRequest } from "@/lib/auth-mode";
import { getSamlClient, isMockAuthEnabled } from "@/lib/saml";

export async function GET(request: Request) {
  if (isMockAuthEnabled(process.env, hostnameFromRequest(request))) {
    return NextResponse.json(
      { success: false, message: "モック認証中のため SAML Metadata は無効です" },
      { status: 404 }
    );
  }
  try {
    const xml = getSamlClient().generateServiceProviderMetadata(null);
    return new NextResponse(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("[saml] metadata generation failed", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "SAML Metadata を生成できません",
      },
      { status: 503 }
    );
  }
}
