import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Served at /robots.txt. It is a request, not access control: the private
// routes are still protected by proxy.ts. This just stops crawlers wasting
// their budget on pages that only redirect to sign-in.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/watchlists", "/sign-in", "/sign-up"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
