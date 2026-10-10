import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import "./env";

/**
 * Clerk's Frontend API host (e.g. clerk.example.com, or *.clerk.accounts.dev
 * for a development instance). It's base64-encoded inside the publishable
 * key, so Preview and Production each get the host of the key they use.
 */
function clerkFrontendApiHost() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  const host = Buffer.from(key.split("_")[2] ?? "", "base64").toString().replace(/\$$/, "");
  return host || null;
}

/**
 * A static policy rather than nonces: nonces need every page rendered per
 * request, which would throw away the ISR caching the browse and title pages
 * rely on. The cost is 'unsafe-inline' for scripts (Next.js inlines its RSC
 * payload, and app/layout.tsx inlines the palette script). Everything else is
 * locked to the origins below; add any new third party here, or it won't load.
 */
function contentSecurityPolicy() {
  const isDev = process.env.NODE_ENV === "development";
  const clerk = clerkFrontendApiHost();
  const clerkOrigin = clerk ? `https://${clerk}` : "";

  return [
    "default-src 'self'",
    // React needs eval in development only, for its server error stacks.
    // va.vercel-scripts.com serves the Analytics script outside Vercel.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${clerkOrigin} https://challenges.cloudflare.com https://*.protect.clerk.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    // Posters go through /_next/image ('self'). The CDNs are listed for the
    // few places that load them directly; img.clerk.com serves avatars.
    "img-src 'self' data: blob: https://img.clerk.com https://image.tmdb.org https://s4.anilist.co https://media.kitsu.app",
    "font-src 'self' data:",
    // Sentry reports go through the same-origin /monitoring tunnel, and
    // Vercel Analytics posts to /_vercel, so neither needs an entry here.
    `connect-src 'self' ${clerkOrigin} https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com`,
    "frame-src 'self' https://www.youtube-nocookie.com https://challenges.cloudflare.com https://*.protect.clerk.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Nobody may frame this site (clickjacking).
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .map((directive) => directive.replace(/\s+/g, " ").trim())
    .join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Features the site never uses. Autoplay and fullscreen stay
          // allowed, because the trailer player needs them.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
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
