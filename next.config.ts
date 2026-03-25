import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow HMR WebSocket connections from tunnel domain
  allowedDevOrigins: ["btn.nopel.cloud", "*.nopel.cloud"],

  // Allow Server Actions from tunnel domain (prevent CSRF rejection)
  experimental: {
    serverActions: {
      allowedOrigins: ["btn.nopel.cloud", "*.nopel.cloud"],
    },
  },

  // Prevent Cloudflare from caching Next.js dev assets
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
