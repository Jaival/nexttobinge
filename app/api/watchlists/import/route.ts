import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { GUEST_LIMIT, isPosterUrl } from "@/lib/guest-watchlist-rules";

// Where a visitor's guest list lands after they sign in. Found by name, so
// every import for a user fills the same list instead of creating a new one.
const IMPORT_LIST_NAME = "My watchlist";

// The body comes from localStorage, which the visitor can edit. Validate the
// shape and cap the size; never trust a client-side limit on its own.
const importSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        type: z.enum(["movie", "tv", "anime"]),
        title: z.string().trim().min(1).max(300),
        // nullish, not nullable: unscored titles arrive with the field missing.
        posterUrl: z.string().refine(isPosterUrl).nullish(),
        year: z.string().max(10).nullish(),
        rating: z.number().min(0).max(100).nullish(),
      })
    )
    .min(1)
    .max(GUEST_LIMIT),
});

/**
 * Moves a signed-out visitor's saved titles into their account.
 *
 * Idempotent: the client can retry after a timeout, or two tabs can both run
 * the import, and the result is the same as running it once.
 * - An advisory lock makes concurrent imports for one user take turns, so they
 *   can't both create "My watchlist".
 * - ON CONFLICT DO NOTHING (backed by the unique index from migration 0002)
 *   skips titles that are already in the list.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const result = await db.transaction(async (tx) => {
    // Released automatically when the transaction ends.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`import:${userId}`}))`);

    let list = await tx.query.watchlists.findFirst({
      where: and(eq(watchlists.userId, userId), eq(watchlists.name, IMPORT_LIST_NAME)),
    });
    list ??= (
      await tx
        .insert(watchlists)
        .values({ userId, name: IMPORT_LIST_NAME, description: "Saved before you signed up" })
        .returning()
    )[0];

    // Also skip what's already there in code, so the import stays correct on a
    // database where migration 0002 hasn't been applied yet.
    const existing = await tx
      .select({ mediaType: watchlistItems.mediaType, mediaId: watchlistItems.mediaId })
      .from(watchlistItems)
      .where(eq(watchlistItems.watchlistId, list.id));
    const seen = new Set(existing.map((row) => `${row.mediaType}:${row.mediaId}`));
    const fresh = parsed.data.items.filter((item) => {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fresh.length === 0) return { watchlistId: list.id, name: list.name, imported: 0 };

    const inserted = await tx
      .insert(watchlistItems)
      .values(
        fresh.map((item) => ({
          watchlistId: list.id,
          mediaType: item.type,
          mediaId: String(item.id),
          title: item.title,
          posterUrl: item.posterUrl ?? null,
          releaseYear: item.year ?? null,
          rating: item.rating != null ? String(item.rating) : null,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: watchlistItems.id });

    return { watchlistId: list.id, name: list.name, imported: inserted.length };
  });

  return NextResponse.json(result);
}
