import { handleMailConfigGet, handleMailConfigSave } from "@/lib/mail-config-handlers";

export async function GET(request: Request) {
  return handleMailConfigGet(request);
}

export async function POST(request: Request) {
  return handleMailConfigSave(request);
}

export async function PUT(request: Request) {
  return handleMailConfigSave(request);
}
