import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { watchlists } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUuid } from "@/lib/utils";
import { expirePublicList, refreshPublicList } from "@/lib/public-lists";

// Every field is optional so one endpoint handles rename and share. Only the
// fields actually sent are written: a rename must not wipe the description.
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable(),
    isPublic: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Authorization lives in the WHERE clause: the row is only updated if this
  // user owns it. Knowing a list's id is not enough to change it.
  const [updated] = await db
    .update(watchlists)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.isPublic !== undefined) expirePublicList(id);
  else refreshPublicList(id);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deleted] = await db
    .delete(watchlists)
    .where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  expirePublicList(id);
  return new NextResponse(null, { status: 204 });
}
