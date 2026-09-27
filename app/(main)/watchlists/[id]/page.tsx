import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUuid } from "@/lib/utils";
import { WatchlistDetailClient } from "./watchlist-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchlistDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) notFound();

  const items = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.watchlistId, id))
    .orderBy(watchlistItems.addedAt);

  return <WatchlistDetailClient watchlist={wl} initialItems={items} />;
}
