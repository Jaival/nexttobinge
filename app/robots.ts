import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Served at /robots.txt. It is a request, not access control: the private
// routes are still protected by proxy.ts. This just stops crawlers wasting
// their budget on pages that only redirect to sign-in.
//
// /search and /tonight are rendered per query, so every crawled URL is a
// function run with no value to index. Filtered browse grids (sort, genre,
// year, rating, format; see lib/browse-filters.ts) are already noindex, but
// crawlers still fetch each combination. "*" is a wildcard (Google syntax).
// A filter param is either first ("?genre=") or later ("&genre=") in the query
// string, so each needs both patterns. Plain "?page=N" stays crawlable.
//
// Preview deployments (one per pull request) are full copies of the site at
// other URLs. Indexed, they'd compete with production as duplicate content,
// so they ask every crawler to stay out. VERCEL_ENV is set by Vercel:
// "production", "preview" or "development".
//
// GPTBot (OpenAI's training crawler) followed the "more like this" links
// through every movie at a steady 2 requests a second: 27K requests in four
// hours, each an uncached page render. It obeys robots.txt, so it is asked to
// stay out entirely. OAI-SearchBot (ChatGPT search results) is not blocked.
const BROWSE_FILTER_PARAMS = ["sort", "genre", "year", "rating", "format"];

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/watchlists",
          "/sign-in",
          "/sign-up",
          "/search",
          "/tonight",
          ...BROWSE_FILTER_PARAMS.flatMap((p) => [`/browse/*?${p}=`, `/browse/*&${p}=`]),
        ],
      },
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
