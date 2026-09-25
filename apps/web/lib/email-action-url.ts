import type { NotificationSystemName } from "@/lib/notifications";

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'）)\]】>]+/gi;
const HREF_PATTERN = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;

const SAAS_HOST_HINTS: Record<NotificationSystemName, string[]> = {
  カオナビ: ["kaonavi.jp", "kaonavi.com"],
  TOKIUM: ["keihi.com", "tokium.jp", "tokium.com"],
  クラウドハウス労務: ["cloudhouse", "cloud-house", "crowdhouse"],
  全社ポータル: [],
};

function sanitizeUrl(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/[),.;:」』、。]+$/g, "");
  if (!/^https?:\/\/[a-z0-9.-]+/i.test(trimmed)) {
    return null;
  }
  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return null;
  }
  return trimmed;
}

function collectUrls(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(HREF_PATTERN)) {
    const href = sanitizeUrl(match[1] ?? "");
    if (href && !seen.has(href)) {
      seen.add(href);
      found.push(href);
    }
  }
  for (const match of text.matchAll(HTTP_URL_PATTERN)) {
    const url = sanitizeUrl(match[0] ?? "");
    if (url && !seen.has(url)) {
      seen.add(url);
      found.push(url);
    }
  }
  return found;
}

function matchesSaas(url: string, systemName: NotificationSystemName): boolean {
  const lower = url.toLowerCase();
  return SAAS_HOST_HINTS[systemName].some((hint) => lower.includes(hint));
}

export function extractActionUrl(
  text: string,
  systemName: NotificationSystemName = "全社ポータル"
): string | undefined {
  const urls = collectUrls(text);
  if (urls.length === 0) {
    return undefined;
  }
  const saasMatch = urls.find((url) => matchesSaas(url, systemName));
  return saasMatch ?? urls[0];
}
