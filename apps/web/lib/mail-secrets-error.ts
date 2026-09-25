export const SAAS_MAIL_SECRET_NAME = "hitowa/notification-portal/saas-mail-credentials";

export function resolveSecretsManagerRegion(env: NodeJS.ProcessEnv = process.env): string {
  const region = env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim();
  return region && region !== "" ? region : "ap-northeast-1";
}

export class MailCredentialsError extends Error {
  readonly detail: string;

  constructor(message: string, detail: string) {
    super(message);
    this.name = "MailCredentialsError";
    this.detail = detail;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function describeAwsSdkError(error: unknown, region: string): string {
  const name =
    typeof error === "object" && error !== null && "name" in error && typeof error.name === "string"
      ? error.name
      : "Error";
  const message = error instanceof Error ? error.message : String(error);
  let httpStatus: number | undefined;
  if (isRecord(error) && isRecord(error.$metadata) && typeof error.$metadata.httpStatusCode === "number") {
    httpStatus = error.$metadata.httpStatusCode;
  }
  const parts = [
    `region=${region}`,
    `secretId=${SAAS_MAIL_SECRET_NAME}`,
    `name=${name}`,
    `message=${message}`,
  ];
  if (httpStatus !== undefined) {
    parts.push(`httpStatus=${httpStatus}`);
  }
  return parts.join("; ");
}
