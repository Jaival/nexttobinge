import type { MetadataRoute } from "next";
import { discoverMovies, discoverTV, posterUrl } from "@/lib/tmdb";
import { getPopularAnime, getTrendingAnime } from "@/lib/anilist";
import { absoluteUrl } from "@/lib/seo";
import { COLLECTIONS } from "@/lib/collections";

// Served at /sitemap.xml. We can't list every title TMDB and AniList know
// about, so this lists the most popular ones: they're what people search for,
// and Google finds the rest by following "More like this" links from here.
const TMDB_PAGES = 10; // 20 titles per page
const ANILIST_PAGES = 3; // 50 titles per page (AniList's maximum)

type Entry = MetadataRoute.Sitemap[number];

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

/**
 * One failed page shouldn't cost us the whole sitemap, and a TMDB or AniList
 * outage must not fail the build. allSettled keeps whatever did load.
 */
async function settled<T>(promises: Promise<T[]>[]): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, series, anime] = await Promise.all([
    settled(
      range(TMDB_PAGES).map((page) =>
        discoverMovies({ page: String(page) }).then((d) =>
          d.results.map((m) => ({ path: `/media/movie/${m.id}`, image: posterUrl(m.poster_path, "w500") }))
        )
      )
    ),
    settled(
      range(TMDB_PAGES).map((page) =>
        discoverTV({ page: String(page) }).then((d) =>
          d.results.map((t) => ({ path: `/media/tv/${t.id}`, image: posterUrl(t.poster_path, "w500") }))
        )
      )
    ),
    settled([
      getTrendingAnime(1, 50).then((d) => d.media),
      ...range(ANILIST_PAGES).map((page) => getPopularAnime(page, 50).then((d) => d.media)),
    ]).then((media) =>
      media.map((a) => ({ path: `/media/anime/${a.id}`, image: a.coverImage.extraLarge }))
    ),
  ]);

  const staticEntries: Entry[] = [
    "/",
    "/browse/movies",
    "/browse/series",
    "/browse/anime",
    "/tonight",
    "/collections",
    "/privacy",
    ...COLLECTIONS.map((c) => `/collections/${c.slug}`),
  ].map((path) => ({ url: absoluteUrl(path) }));

  // Trending and popular lists overlap, so dedupe by URL.
  const mediaEntries = new Map<string, Entry>();
  for (const { path, image } of [...movies, ...series, ...anime]) {
    const url = absoluteUrl(path);
    if (!mediaEntries.has(url)) mediaEntries.set(url, { url, images: image ? [image] : undefined });
  }

  return [...staticEntries, ...mediaEntries.values()];
}
