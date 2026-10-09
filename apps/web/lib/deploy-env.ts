export function cookieDomainFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const domain = env.COOKIE_DOMAIN?.trim() ?? "";
  if (domain === "" || domain === "localhost" || domain === "127.0.0.1") {
    return undefined;
  }
  return domain;
}

export function portalOriginFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const origin = env.PORTAL_ORIGIN?.trim() ?? "";
  if (origin === "" || origin === "*") {
    return undefined;
  }
  return origin;
}
