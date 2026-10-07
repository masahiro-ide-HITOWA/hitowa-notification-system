import { NextResponse } from "next/server";
import { fetchEmailsJobErrorResponse, runFetchEmailsJob } from "@/lib/email-fetch-job";

export async function GET() {
  try {
    const result = await runFetchEmailsJob();
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    console.error("[cron/fetch-emails] job failed", error);
    const failure = fetchEmailsJobErrorResponse(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
