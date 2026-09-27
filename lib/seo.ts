import type { Metadata } from "next";
import { env } from "@/env";

export const SITE_NAME = "NextToBinge";
export const SITE_DESCRIPTION =
  "Find movies, series, and anime to watch. Save them in personal watchlists.";

// Sitemaps, robots.txt and canonical tags need absolute URLs, so the origin has
// to be known on the server. Explicit config wins; on Vercel the production
// domain is injected automatically; locally it's the dev server.
export const SITE_URL = (
  env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}

/**
 * Search snippets cut off around 155-160 characters. Trimming at a word
 * boundary keeps Google from showing a half word followed by "...".
 */
export function truncateDescription(text: string | null | undefined, max = 155) {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

interface MediaMetadataInput {
  title: string;
  year: string | null;
  description: string | null | undefined;
  path: string;
  kind: "movie" | "tv";
  /** Wide image first (link previews are 1.91:1), poster as a fallback. */
  images: (string | null | undefined)[];
}

/**
 * Metadata for a movie / series / anime detail page.
 *
 * A child segment's `openGraph` replaces the root layout's instead of merging
 * with it, so the shared fields (siteName, locale) are repeated here.
 */
export function mediaMetadata({
  title,
  year,
  description,
  path,
  kind,
  images,
}: MediaMetadataInput): Metadata {
  const fullTitle = year ? `${title} (${year})` : title;
  const desc = truncateDescription(description) ?? `${title} on ${SITE_NAME}.`;
  const imageUrls = images.filter((url): url is string => Boolean(url));

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: kind === "movie" ? "video.movie" : "video.tv_show",
      title: fullTitle,
      description: desc,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      images: imageUrls.map((url) => ({ url, alt: title })),
    },
    twitter: {
      card: imageUrls.length ? "summary_large_image" : "summary",
      title: fullTitle,
      description: desc,
      images: imageUrls,
    },
  };
}

/**
 * Metadata for the paginated browse grids. Every page gets its own canonical:
 * pointing page 5 at page 1 would tell Google that page 5's titles don't exist.
 *
 * Filtered grids are noindex. Every combination of genre, year, rating and
 * sort is a URL, thousands of near-duplicates that would waste crawl budget.
 * The curated collections (/collections) are the filtered pages meant to rank.
 * "follow" still lets Google reach the titles they link to.
 */
export function browseMetadata(
  path: string,
  title: string,
  description: string,
  page: number,
  filtered = false
): Metadata {
  const onFirstPage = page <= 1;
  const pageTitle = onFirstPage ? title : `${title} · Page ${page}`;
  if (filtered) {
    return { title: pageTitle, description, robots: { index: false, follow: true } };
  }
  return {
    title: pageTitle,
    description,
    alternates: { canonical: onFirstPage ? path : `${path}?page=${page}` },
  };
}
