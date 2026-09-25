function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isLinkedStatusPayload(data: unknown): boolean {
  if (!isRecord(data) || data.success !== true) {
    return false;
  }
  if (data.isLinked === true) {
    return true;
  }
  return data.status === "COMPLETED" || data.status === "ACTIVE";
}
