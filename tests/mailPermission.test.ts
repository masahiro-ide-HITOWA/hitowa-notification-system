import { describe, expect, it } from "vitest";

import {
  FIELD_MAIL_SETTINGS_TITLE,
  HQ_WEB_MAIL_EXCLUDED_NOTE,
  canUseWebMail,
  mypageMailSettingsView,
} from "../apps/web/lib/mail-permission";

describe("canUseWebMail", () => {
  it("returns false for HQ employees on @hitowa.com", () => {
    expect(canUseWebMail("mei-sei@hitowa.com")).toBe(false);
    expect(canUseWebMail("taro@HITOWA.COM")).toBe(false);
  });

  it("returns true for other domains such as KAGOYA field staff", () => {
    expect(canUseWebMail("staff@kagoya.jp")).toBe(true);
    expect(canUseWebMail("user@example.com")).toBe(true);
    expect(canUseWebMail("masahiro-ide@gr.hitowa.com")).toBe(true);
  });

  it("returns false when the email is missing or invalid", () => {
    expect(canUseWebMail(undefined)).toBe(false);
    expect(canUseWebMail("")).toBe(false);
    expect(canUseWebMail("not-an-email")).toBe(false);
  });
});

describe("mypage mail settings view", () => {
  it("shows the HQ exclusion note for @hitowa.com", () => {
    expect(mypageMailSettingsView("mei-sei@hitowa.com")).toBe("excluded");
    expect(HQ_WEB_MAIL_EXCLUDED_NOTE).toBe("※本部社員はWebメール機能の対象外です");
  });

  it("shows the KAGOYA settings card for field domains", () => {
    expect(mypageMailSettingsView("masahiro-ide@gr.hitowa.com")).toBe("settings");
    expect(mypageMailSettingsView("staff@kagoya.jp")).toBe("settings");
    expect(FIELD_MAIL_SETTINGS_TITLE).toBe("📧 Webメール接続設定（KAGOYA等）");
  });
});
