import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const FALLBACK_ENCRYPTION_KEY = "hitowa-dev-mail-encryption-key";

function encryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || FALLBACK_ENCRYPTION_KEY;
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptPassword(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptPassword(encryptedText: string): string {
  const parts = encryptedText.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Invalid encrypted password payload");
  }
  const iv = Buffer.from(parts[0], "base64url");
  const authTag = Buffer.from(parts[1], "base64url");
  const encrypted = Buffer.from(parts[2], "base64url");
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
