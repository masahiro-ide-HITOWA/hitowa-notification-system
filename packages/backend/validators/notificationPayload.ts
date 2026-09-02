import type { NotificationPayload, SourceSystem } from "../models/notification";

const SOURCE_SYSTEMS: readonly SourceSystem[] = [
  "kaonavi",
  "tokium",
  "cloudhouse_labor",
];

export type NotificationPayloadValidationResult =
  | { ok: true; payload: NotificationPayload }
  | { ok: false; errors: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSourceSystem(value: unknown): value is SourceSystem {
  return (
    typeof value === "string" &&
    (SOURCE_SYSTEMS as readonly string[]).includes(value)
  );
}

export function validateNotificationPayload(
  input: unknown,
): NotificationPayloadValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["Request body must be a JSON object"] };
  }

  const body = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!isNonEmptyString(body.target_employee_id)) {
    errors.push("target_employee_id is required and must be a non-empty string");
  }
  if (!isSourceSystem(body.source_system)) {
    errors.push(
      `source_system must be one of: ${SOURCE_SYSTEMS.join(", ")}`,
    );
  }
  if (!isNonEmptyString(body.title)) {
    errors.push("title is required and must be a non-empty string");
  }
  if (!isNonEmptyString(body.body)) {
    errors.push("body is required and must be a non-empty string");
  }
  if (!isNonEmptyString(body.action_url)) {
    errors.push("action_url is required and must be a non-empty string");
  }
  if (!isNonEmptyString(body.category)) {
    errors.push("category is required and must be a non-empty string");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      target_employee_id: body.target_employee_id as string,
      source_system: body.source_system as SourceSystem,
      title: body.title as string,
      body: body.body as string,
      action_url: body.action_url as string,
      category: body.category as string,
    },
  };
}
