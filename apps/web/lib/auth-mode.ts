export const SAML_LOGIN_PATH = "/api/auth/saml/login";
export const SAML_CALLBACK_PATH = "/api/auth/saml/callback";
export const SAML_COMPLETE_PATH = "/api/auth/saml/complete";
export const SAML_METADATA_PATH = "/api/auth/saml/metadata";
export const SESSION_COOKIE_NAME = "hitowa_session";

export function isMockAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = (env.USE_MOCK_AUTH ?? env.NEXT_PUBLIC_USE_MOCK_AUTH)?.trim();
  return value !== "false";
}
