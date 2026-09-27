import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { WatchlistsClient } from "./watchlists-client";
import { GuestWatchlist } from "./guest-watchlist";

const PREVIEW_COUNT = 4;

export default async function WatchlistsPage() {
  const { userId } = await auth();
  // Signed-out visitors see what they've saved in this browser.
  if (!userId) return <GuestWatchlist />;

  const rows = await db
    .select({
      id: watchlists.id,
      name: watchlists.name,
      description: watchlists.description,
      isPublic: watchlists.isPublic,
      createdAt: watchlists.createdAt,
      itemCount: sql<number>`count(${watchlistItems.id})::int`,
    })
    .from(watchlists)
    .leftJoin(watchlistItems, eq(watchlists.id, watchlistItems.watchlistId))
    .where(eq(watchlists.userId, userId))
    .groupBy(watchlists.id)
    .orderBy(desc(watchlists.createdAt));

  // Poster strip for each card — a list of names tells you nothing about what
  // is in it. One extra query, capped client-side to PREVIEW_COUNT per list.
  const ids = rows.map((r) => r.id);
  const previewRows = ids.length
    ? await db
        .select({
          watchlistId: watchlistItems.watchlistId,
          posterUrl: watchlistItems.posterUrl,
        })
        .from(watchlistItems)
        .where(inArray(watchlistItems.watchlistId, ids))
        .orderBy(desc(watchlistItems.addedAt))
    : [];

  const postersByList = new Map<string, string[]>();
  for (const row of previewRows) {
    if (!row.posterUrl) continue;
    const posters = postersByList.get(row.watchlistId) ?? [];
    if (posters.length >= PREVIEW_COUNT) continue;
    posters.push(row.posterUrl);
    postersByList.set(row.watchlistId, posters);
  }

  return (
    <WatchlistsClient
      initialWatchlists={rows.map((row) => ({
        ...row,
        posters: postersByList.get(row.id) ?? [],
      }))}
    />
  );
}
