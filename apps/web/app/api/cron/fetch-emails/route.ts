import { NextResponse } from "next/server";
import { fetchEmailsJobErrorResponse, runFetchEmailsJob } from "@/lib/email-fetch-job";
import { MailCredentialsError } from "@/lib/secrets";

export async function GET() {
  try {
    const result = await runFetchEmailsJob();
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    console.error("[cron/fetch-emails] job failed", error);
    if (error instanceof MailCredentialsError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          errors: [{ message: error.message, detail: error.detail }],
        },
        { status: 404 }
      );
    }
    const failure = fetchEmailsJobErrorResponse(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
