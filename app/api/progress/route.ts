import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { episodeProgress } from "@/lib/db/schema";
import { getTVDetails } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import { animeGuide, episodeLabel, nextEpisode, tvGuide, type EpisodeGuide } from "@/lib/progress";
import type { MediaCardItem } from "@/components/media-card";

// Looked at most-recent first. Bounds the upstream fan-out per request.
const CANDIDATES = 18;
const ROW_SIZE = 12;

async function guideFor(type: "movie" | "tv" | "anime", id: number): Promise<EpisodeGuide> {
  if (type === "tv") return tvGuide(await getTVDetails(id));
  if (type === "anime") return animeGuide(await getAnimeDetails(id));
  throw new Error(`No episodes for ${type}`);
}

/**
 * The home page's "Up next" row: the next unwatched episode of each show the
 * user is part-way through, most recently watched first.
 *
 * Personal, so fetched by the browser like /api/recommendations. Unlike
 * recommendations it must be fresh: you mark an episode, go home, and expect
 * the row to have moved on. So no-store, not max-age.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(episodeProgress)
    .where(eq(episodeProgress.userId, userId))
    .orderBy(desc(episodeProgress.updatedAt))
    .limit(CANDIDATES);

  // Which episode comes next depends on the show (season lengths, what has
  // aired), so each row needs its details. Those are shared and cached, and
  // allSettled means one failing lookup drops one card, not the row.
  const guides = await Promise.allSettled(
    rows.map((row) => guideFor(row.mediaType, Number(row.mediaId)))
  );

  const items: MediaCardItem[] = [];
  rows.forEach((row, i) => {
    const guide = guides[i];
    if (guide.status !== "fulfilled" || row.mediaType === "movie") return;
    const next = nextEpisode(guide.value, row);
    // Caught up or finished: nothing to watch next, so not "up next".
    if (next.kind !== "next" || items.length === ROW_SIZE) return;
    items.push({
      id: Number(row.mediaId),
      title: row.title,
      posterUrl: row.posterUrl,
      year: null,
      rating: null,
      type: row.mediaType,
      note: episodeLabel(next, row.mediaType),
    });
  });

  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}
