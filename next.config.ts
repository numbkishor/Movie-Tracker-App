import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // .cursorrules is this repo's ruleset for agents; a second auto-generated one
  // would just compete with it.
  agentRules: false,

  images: {
    // TMDB is the only remote image host. Nothing user-uploaded is served,
    // so a single narrow allowlist entry is all this ever needs.
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
