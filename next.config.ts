import { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.234"],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://14.224.212.102:3060/api/:path*",
      },
    ];
  },
};

export default nextConfig;
