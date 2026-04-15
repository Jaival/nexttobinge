import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { WatchlistsClient } from "./watchlists-client";

export default async function WatchlistsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const rows = await db
    .select({
      id: watchlists.id,
      name: watchlists.name,
      description: watchlists.description,
      createdAt: watchlists.createdAt,
      itemCount: sql<number>`count(${watchlistItems.id})::int`,
    })
    .from(watchlists)
    .leftJoin(watchlistItems, eq(watchlists.id, watchlistItems.watchlistId))
    .where(eq(watchlists.userId, userId))
    .groupBy(watchlists.id)
    .orderBy(desc(watchlists.createdAt));

  return <WatchlistsClient initialWatchlists={rows} />;
}
