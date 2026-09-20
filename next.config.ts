import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "cursor",
    "0.0.0.0",
    "172.30.0.2",
    "*.cursor.sh",
    "**.cursor.sh",
    "*.cursorusercontent.com",
    "**.cursorusercontent.com",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.dexscreener.com" },
      { protocol: "https", hostname: "assets.geckoterminal.com" },
    ],
  },
};

export default nextConfig;
