import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { decryptPassword, encryptPassword } from "@/lib/mail-crypto";
import {
  isMaskedOrEmptyPassword,
  recordFromItem,
  toPublicMailConfig,
  type MailConfigInput,
  type MailConfigPublic,
} from "@/lib/mail-config";
import { docClient } from "@/lib/dynamodb";

const MAIL_CONFIG_TABLE =
  process.env.DYNAMODB_MAIL_CONFIG_TABLE || "HitowaMailConfigs";

export interface MailConfigStoreDeps {
  getItem: (portalUserId: string) => Promise<Record<string, unknown> | null>;
  putItem: (item: Record<string, unknown>) => Promise<void>;
  now?: () => string;
}

async function defaultGetItem(portalUserId: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: MAIL_CONFIG_TABLE,
      Key: { portalUserId },
    })
  );
  return (result.Item as Record<string, unknown> | undefined) ?? null;
}

async function defaultPutItem(item: Record<string, unknown>): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: MAIL_CONFIG_TABLE,
      Item: item,
    })
  );
}

const defaultDeps: MailConfigStoreDeps = {
  getItem: defaultGetItem,
  putItem: defaultPutItem,
};

export async function getMailConfig(
  portalUserId: string,
  deps: MailConfigStoreDeps = defaultDeps
): Promise<MailConfigPublic> {
  try {
    const item = await deps.getItem(portalUserId);
    return toPublicMailConfig(portalUserId, recordFromItem(item));
  } catch (error) {
    console.error("[mail-config] GetItem failed", error);
    return toPublicMailConfig(portalUserId, null);
  }
}

export async function getMailConfigForConnection(
  portalUserId: string,
  deps: MailConfigStoreDeps = defaultDeps
): Promise<(MailConfigInput & { portalUserId: string }) | null> {
  const record = recordFromItem(await deps.getItem(portalUserId));
  if (!record || !record.passwordEncrypted) {
    return null;
  }
  return {
    portalUserId,
    imapHost: record.imapHost,
    imapPort: record.imapPort,
    smtpHost: record.smtpHost,
    smtpPort: record.smtpPort,
    username: record.username,
    password: decryptPassword(record.passwordEncrypted),
  };
}

export async function saveMailConfig(
  portalUserId: string,
  config: MailConfigInput,
  deps: MailConfigStoreDeps = defaultDeps
): Promise<MailConfigPublic> {
  const existing = recordFromItem(await deps.getItem(portalUserId));
  let passwordEncrypted = existing?.passwordEncrypted ?? "";

  if (!isMaskedOrEmptyPassword(config.password)) {
    passwordEncrypted = encryptPassword(config.password);
  }

  if (!passwordEncrypted) {
    throw new Error("password is required");
  }

  const updatedAt = deps.now ? deps.now() : new Date().toISOString();
  const item = {
    portalUserId,
    imapHost: config.imapHost,
    imapPort: config.imapPort,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    username: config.username,
    passwordEncrypted,
    updatedAt,
  };
  await deps.putItem(item);
  return toPublicMailConfig(portalUserId, item);
}
