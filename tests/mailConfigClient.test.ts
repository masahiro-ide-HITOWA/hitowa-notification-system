import { describe, expect, it } from "vitest";
import {
  MAIL_CONNECTION_TIMEOUT_MESSAGE,
  mailApiErrorMessage,
  readApiJson,
} from "../apps/web/lib/mail-config-client";

describe("readApiJson", () => {
  it("parses a JSON body", async () => {
    const response = new Response(JSON.stringify({ success: true }), { status: 200 });
    await expect(readApiJson<{ success: boolean }>(response)).resolves.toEqual({ success: true });
  });

  it("maps an empty body to a connection timeout message", async () => {
    const response = new Response("", { status: 504 });
    await expect(readApiJson(response)).rejects.toThrow(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  });

  it("maps a non-JSON gateway body to a connection timeout message", async () => {
    const response = new Response("<html>timeout</html>", { status: 504 });
    await expect(readApiJson(response)).rejects.toThrow(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  });

  it("maps Unexpected end of JSON input to a connection timeout message", () => {
    const error = new SyntaxError("Unexpected end of JSON input");
    expect(mailApiErrorMessage(error, "保存に失敗しました")).toBe(MAIL_CONNECTION_TIMEOUT_MESSAGE);
  });
});
