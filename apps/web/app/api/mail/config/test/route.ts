import { handleMailConfigTest } from "@/lib/mail-config-handlers";

export async function POST(request: Request) {
  return handleMailConfigTest(request);
}
