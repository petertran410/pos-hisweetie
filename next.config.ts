import { NextConfig } from "next";

// Browser HTTPS không được gọi HTTP (Mixed Content). Nếu env trỏ http://...
// thì ép client dùng same-origin `/api`. Proxy thật nằm ở app/api/[...path].
const rawPublicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
const publicApiUrl = rawPublicApiUrl.startsWith("http://")
  ? "/api"
  : rawPublicApiUrl || "/api";

const nextConfig: NextConfig = {
  // standalone dành cho Docker/NAS; Vercel tự đóng gói, không dùng output này.
  ...(!process.env.VERCEL ? { output: "standalone" as const } : {}),
  allowedDevOrigins: ["192.168.1.234"],
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },
};

export default nextConfig;
