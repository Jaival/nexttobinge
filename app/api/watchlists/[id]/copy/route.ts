import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { isUuid } from "@/lib/utils";

/**
 * "Save a copy" on a shared list: creates a new list for the signed-in user
 * with the same titles, all set back to "plan to watch".
 *
 * A copy is a snapshot, not a link. Later edits by either owner don't affect
 * the other list.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: you may copy a list if it's public, or if it's yours. A
  // private list answers 404, not 403, so its existence isn't confirmed.
  const source = await db.query.watchlists.findFirst({
    where: and(
      eq(watchlists.id, id),
      or(eq(watchlists.isPublic, true), eq(watchlists.userId, userId))
    ),
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(watchlists)
      .values({
        userId,
        name: source.name,
        description: source.description ?? "Copied from a shared list",
      })
      .returning();

    const items = await tx
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.watchlistId, id))
      .orderBy(asc(watchlistItems.addedAt));

    if (items.length > 0) {
      await tx.insert(watchlistItems).values(
        items.map((item) => ({
          watchlistId: created.id,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
          title: item.title,
          posterUrl: item.posterUrl,
          releaseYear: item.releaseYear,
          rating: item.rating,
        }))
      );
    }

    return { id: created.id, name: created.name, itemCount: items.length };
  });

  return NextResponse.json(copy, { status: 201 });
}
