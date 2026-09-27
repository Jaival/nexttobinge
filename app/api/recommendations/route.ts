import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { getMovieRecommendations, getTVRecommendations } from "@/lib/tmdb";
import { getAnimeRecommendations } from "@/lib/anilist";
import { animeToCard, movieToCard, tvToCard } from "@/lib/media-cards";
import type { MediaCardItem } from "@/components/media-card";

const SEEDS = 3;
const PER_ROW = 12;

async function recommendationsFor(type: string, id: number): Promise<MediaCardItem[]> {
  if (type === "movie") return (await getMovieRecommendations(id)).results.map(movieToCard);
  if (type === "tv") return (await getTVRecommendations(id)).results.map(tvToCard);
  return (await getAnimeRecommendations(id)).map(animeToCard);
}

/**
 * "Because you saved X" rows for the home page.
 *
 * The home page itself is the same for everyone, so it's rendered once and
 * served from the CDN. This part is personal and can't be: a shared cache
 * would show one user's taste to the next visitor. So the browser fetches it
 * separately, and the response is marked private.
 *
 * The TMDB/AniList lookups underneath are still shared: recommendations for a
 * given title are the same for every user, so they sit in the data cache.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await db
    .select({
      mediaType: watchlistItems.mediaType,
      mediaId: watchlistItems.mediaId,
      title: watchlistItems.title,
    })
    .from(watchlistItems)
    .innerJoin(watchlists, eq(watchlists.id, watchlistItems.watchlistId))
    .where(eq(watchlists.userId, userId))
    .orderBy(desc(watchlistItems.addedAt));

  const savedKeys = new Set(saved.map((s) => `${s.mediaType}:${s.mediaId}`));

  // The most recent distinct titles: what the user is into right now.
  const seeds: typeof saved = [];
  const seedKeys = new Set<string>();
  for (const item of saved) {
    const key = `${item.mediaType}:${item.mediaId}`;
    if (seedKeys.has(key)) continue;
    seedKeys.add(key);
    seeds.push(item);
    if (seeds.length === SEEDS) break;
  }

  // Fan out: one upstream request per seed, in parallel. allSettled so one
  // slow or failing API costs a row, not the whole response.
  const results = await Promise.allSettled(
    seeds.map((seed) => recommendationsFor(seed.mediaType, Number(seed.mediaId)))
  );

  // Drop titles the user already saved, and don't repeat a title across rows.
  const shown = new Set<string>();
  const rows = seeds
    .map((seed, i) => {
      const result = results[i];
      const items: MediaCardItem[] = [];
      for (const item of result.status === "fulfilled" ? result.value : []) {
        const key = `${item.type}:${item.id}`;
        if (savedKeys.has(key) || shown.has(key)) continue;
        shown.add(key);
        items.push(item);
        if (items.length === PER_ROW) break;
      }
      return { seed: { title: seed.title, type: seed.mediaType, id: Number(seed.mediaId) }, items };
    })
    .filter((row) => row.items.length > 0);

  // private: the browser may reuse it for a minute; CDNs must never store it.
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "private, max-age=60" } });
}
