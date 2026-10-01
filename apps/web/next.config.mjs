import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, max-age=0",
  },
  { key: "Pragma", value: "no-cache" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  async headers() {
    return [
      { source: "/", headers: noStoreHeaders },
      { source: "/mypage", headers: noStoreHeaders },
      { source: "/mypage/:path*", headers: noStoreHeaders },
      { source: "/settings", headers: noStoreHeaders },
      { source: "/settings/:path*", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
