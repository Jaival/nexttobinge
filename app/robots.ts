import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Served at /robots.txt. It is a request, not access control: the private
// routes are still protected by proxy.ts. This just stops crawlers wasting
// their budget on pages that only redirect to sign-in.
//
// Preview deployments (one per pull request) are full copies of the site at
// other URLs. Indexed, they'd compete with production as duplicate content,
// so they ask every crawler to stay out. VERCEL_ENV is set by Vercel:
// "production", "preview" or "development".
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/watchlists", "/sign-in", "/sign-up"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
