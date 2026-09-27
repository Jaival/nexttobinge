import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { isUuid } from "@/lib/utils";
import { isPosterUrl } from "@/lib/guest-watchlist-rules";
import { refreshPublicList } from "@/lib/public-lists";

// What the "add to watchlist" dialog sends. Validated because a public list
// shows these fields to strangers, and its preview image fetches the poster
// URL from the server: only the known image hosts are accepted.
const itemSchema = z.object({
  mediaType: z.enum(["movie", "tv", "anime"]),
  mediaId: z.string().regex(/^\d{1,10}$/),
  title: z.string().trim().min(1).max(300),
  posterUrl: z.string().refine(isPosterUrl).nullish(),
  releaseYear: z.string().max(10).nullish(),
  rating: z.string().regex(/^\d{1,3}(\.\d+)?$/).nullish(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.watchlistId, id))
    .orderBy(watchlistItems.addedAt);

  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = itemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;

  const existing = await db.query.watchlistItems.findFirst({
    where: and(
      eq(watchlistItems.watchlistId, id),
      eq(watchlistItems.mediaId, body.mediaId),
      eq(watchlistItems.mediaType, body.mediaType)
    ),
  });
  if (existing) return NextResponse.json({ error: "already_exists" }, { status: 409 });

  const [item] = await db
    .insert(watchlistItems)
    .values({
      watchlistId: id,
      mediaType: body.mediaType,
      mediaId: body.mediaId,
      title: body.title,
      posterUrl: body.posterUrl ?? null,
      releaseYear: body.releaseYear ?? null,
      rating: body.rating ?? null,
      status: "plan",
    })
    .returning();

  refreshPublicList(id);
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isUuid(itemId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, id)));

  refreshPublicList(id);
  return new NextResponse(null, { status: 204 });
}
