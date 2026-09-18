import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { decryptPassword, encryptPassword } from "@/lib/mail-crypto";
import { MAIL_SERVER_DEFAULTS } from "@/lib/mail-config-defaults";
import {
  planMailPasswordUpdate,
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
  if (!record || !record.passwordEncrypted || record.username.trim() === "") {
    return null;
  }
  return {
    portalUserId,
    ...MAIL_SERVER_DEFAULTS,
    username: record.username,
    password: decryptPassword(record.passwordEncrypted),
  };
}

export async function resolveMailConfigPlaintext(
  portalUserId: string,
  config: MailConfigInput,
  deps: MailConfigStoreDeps = defaultDeps
): Promise<MailConfigInput> {
  const existing = recordFromItem(await deps.getItem(portalUserId));
  const plan = planMailPasswordUpdate(config.password, existing?.passwordEncrypted);
  if (plan.kind === "missing") {
    throw new Error("password is required");
  }
  if (plan.kind === "replace") {
    return { ...MAIL_SERVER_DEFAULTS, username: config.username, password: plan.plaintext };
  }
  return {
    ...MAIL_SERVER_DEFAULTS,
    username: config.username,
    password: decryptPassword(existing?.passwordEncrypted ?? ""),
  };
}

export async function saveMailConfig(
  portalUserId: string,
  config: MailConfigInput,
  deps: MailConfigStoreDeps = defaultDeps
): Promise<MailConfigPublic> {
  const existing = recordFromItem(await deps.getItem(portalUserId));
  const plan = planMailPasswordUpdate(config.password, existing?.passwordEncrypted);
  let passwordEncrypted = existing?.passwordEncrypted ?? "";

  if (plan.kind === "replace") {
    passwordEncrypted = encryptPassword(plan.plaintext);
  }

  if (plan.kind === "missing" || !passwordEncrypted) {
    throw new Error("password is required");
  }

  const updatedAt = deps.now ? deps.now() : new Date().toISOString();
  const item = {
    portalUserId,
    ...MAIL_SERVER_DEFAULTS,
    username: config.username,
    passwordEncrypted,
    updatedAt,
  };
  await deps.putItem(item);
  return toPublicMailConfig(portalUserId, item);
}
