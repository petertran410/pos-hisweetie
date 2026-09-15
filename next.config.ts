import { NextConfig } from "next";

// Browser HTTPS không được gọi HTTP (Mixed Content). Nếu env trỏ http://...
// thì ép client dùng same-origin `/api`, Next.js rewrite proxy sang backend.
const rawPublicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
const publicApiUrl = rawPublicApiUrl.startsWith("http://")
  ? "/api"
  : rawPublicApiUrl || "/api";

const proxyTarget = (
  process.env.API_PROXY_TARGET || "http://14.224.212.102:3060"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // standalone dành cho Docker/NAS; Vercel tự đóng gói, không dùng output này.
  ...(!process.env.VERCEL ? { output: "standalone" as const } : {}),
  allowedDevOrigins: ["192.168.1.234"],
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
