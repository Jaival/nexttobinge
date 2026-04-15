import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;

  const wl = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.userId, userId)),
  });
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const status = body.status as "plan" | "watching" | "watched";
  if (!["plan", "watching", "watched"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [updated] = await db
    .update(watchlistItems)
    .set({ status })
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.watchlistId, id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
