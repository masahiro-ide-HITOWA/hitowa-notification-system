/** 検証済み SAML Assertion から取り出す JIT 用プロファイル */
export interface SamlProfile {
  employee_id: string;
  mail?: string;
}

export function isGmailAddress(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return /@(gmail|googlemail)\.com$/i.test(value.trim());
}
