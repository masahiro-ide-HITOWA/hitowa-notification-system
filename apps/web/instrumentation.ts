export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { assertRequiredEnv } = await import("@/lib/required-env");
  assertRequiredEnv();
}
