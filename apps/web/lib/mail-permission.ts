export function canUseWebMail(email?: string): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  return domain !== "hitowa.com";
}
