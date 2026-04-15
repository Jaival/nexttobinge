import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

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

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const existing = await db.query.watchlistItems.findFirst({
    where: and(
      eq(watchlistItems.watchlistId, id),
      eq(watchlistItems.mediaId, String(body.mediaId)),
      eq(watchlistItems.mediaType, body.mediaType)
    ),
  });
  if (existing) return NextResponse.json({ error: "already_exists" }, { status: 409 });

  const [item] = await db
    .insert(watchlistItems)
    .values({
      watchlistId: id,
      mediaType: body.mediaType,
      mediaId: String(body.mediaId),
      title: body.title,
      posterUrl: body.posterUrl ?? null,
      releaseYear: body.releaseYear ?? null,
      rating: body.rating ?? null,
      status: "plan",
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, id)));

  return new NextResponse(null, { status: 204 });
}
