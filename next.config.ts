import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // One route per workspace tab. Old URLs (bookmarks, emails, shared links) redirect.
  async redirects() {
    return [
      { source: "/social/campaigns", destination: "/campaigns", permanent: true },
      { source: "/social/inbox", destination: "/messages", permanent: true },
      { source: "/brand/campaigns", destination: "/campaigns", permanent: true },
      { source: "/brand/inbox", destination: "/messages", permanent: true },
      { source: "/brand/settings", destination: "/settings", permanent: true },
      { source: "/brand", destination: "/discover", permanent: true },
      { source: "/profile", destination: "/settings", permanent: true },
    ];
  },
};

export default nextConfig;
