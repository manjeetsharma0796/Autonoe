import type { NextConfig } from "next";
import { join } from "node:path";

// Proxy /api/* to the standalone bun backend (server/). In production set
// NEXT_PUBLIC_API_BASE to the deployed backend URL; locally it defaults to
// the server's dev port (8787). See PRD §10a.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  // This app lives inside a bun monorepo; pin the workspace root to silence
  // the multi-lockfile inference warning.
  turbopack: {
    root: join(import.meta.dirname, ".."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
