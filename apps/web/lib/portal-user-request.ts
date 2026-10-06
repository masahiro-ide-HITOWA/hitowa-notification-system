import "server-only";
import { cookies, headers } from "next/headers";
import { hostnameFromHeaders, SESSION_COOKIE_NAME } from "@/lib/auth-mode";
import { resolveGuardedPortalUser } from "@/lib/auth-guard";
import type { PortalUserProfile } from "@/lib/saml-user-attributes";

export async function portalUserFromRequest(): Promise<PortalUserProfile | null> {
  const headerStore = await headers();
  const jar = await cookies();
  return resolveGuardedPortalUser(
    jar.get(SESSION_COOKIE_NAME)?.value,
    hostnameFromHeaders(headerStore)
  );
}
