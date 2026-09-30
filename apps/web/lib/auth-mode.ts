export const SAML_LOGIN_PATH = "/api/auth/saml/login";
export const SAML_CALLBACK_PATH = "/api/auth/saml/callback";
export const SAML_METADATA_PATH = "/api/auth/saml/metadata";

export function isMockAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.USE_MOCK_AUTH !== "false";
}
