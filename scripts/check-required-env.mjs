import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "COOKIE_DOMAIN",
  "PORTAL_ORIGIN",
  "SAML_ENTRY_POINT",
  "SAML_IDP_ISSUER",
  "SAML_CERT",
  "SAML_ISSUER",
  "SAML_CALLBACK_URL",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const merged = {};

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key !== "" && (merged[key] === undefined || String(merged[key]).trim() === "")) {
      merged[key] = value;
    }
  }
}

for (const name of [".env", "apps/web/.env", "apps/web/.env.local", "apps/web/.env.production"]) {
  readEnvFile(path.join(root, name));
}
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === "string") {
    merged[key] = value;
  }
}

const missing = REQUIRED.filter((key) => (merged[key] ?? "").trim() === "");
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
