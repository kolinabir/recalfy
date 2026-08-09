import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bot lives one directory up; pin the root so Turbopack doesn't walk out
  // of this app looking for a lockfile.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  images: {
    // Google serves account avatars from this host; nothing else is allowed.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
