import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import "./env";

const nextConfig: NextConfig = {
  // The section was renamed; keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/browse/dramas", destination: "/browse/series", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.kitsu.app",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Source maps turn minified stack traces back into file:line. They're
  // uploaded at build time, which needs these three (set them in Vercel, not
  // in the repo). Without a token the upload is skipped instead of failing.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Browser errors go to /monitoring on this site, which forwards them to
  // Sentry. Ad blockers block sentry.io directly. proxy.ts keeps the route
  // public, or signed-out visitors' errors would be redirected to sign-in.
  tunnelRoute: "/monitoring",
  telemetry: false,
  silent: !process.env.CI,
});
