import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { episodeProgress } from "@/lib/db/schema";
import { isPosterUrl } from "@/lib/guest-watchlist-rules";

type Params = { params: Promise<{ type: string; id: string }> };

// Only series and anime have episodes. Anything else is a URL that doesn't exist.
const targetSchema = z.object({
  type: z.enum(["tv", "anime"]),
  id: z.string().regex(/^\d{1,10}$/),
});

// The episode isn't checked against TMDB/AniList: that would cost an upstream
// request per click, and a wrong number only affects the user who sent it.
// The bounds keep it a sane integer. Title and poster are shown back on the
// home page, so they get the same checks as a watchlist item.
const progressSchema = z.object({
  season: z.int().min(1).max(999),
  episode: z.int().min(1).max(99999),
  title: z.string().trim().min(1).max(300),
  posterUrl: z.string().refine(isPosterUrl).nullish(),
});

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

async function resolve(params: Params["params"]) {
  const { userId } = await auth();
  const target = targetSchema.safeParse(await params);
  return { userId, target: target.success ? target.data : null };
}

/** Every query is scoped by user_id: there is no way to name someone else's row. */
function ownRow(userId: string, target: z.infer<typeof targetSchema>) {
  return and(
    eq(episodeProgress.userId, userId),
    eq(episodeProgress.mediaType, target.type),
    eq(episodeProgress.mediaId, target.id)
  );
}

export async function GET(_req: Request, { params }: Params) {
  const { userId, target } = await resolve(params);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!target) return notFound();

  const row = await db.query.episodeProgress.findFirst({ where: ownRow(userId, target) });
  return NextResponse.json({
    progress: row ? { season: row.season, episode: row.episode } : null,
  });
}

export async function PUT(req: Request, { params }: Params) {
  const { userId, target } = await resolve(params);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!target) return notFound();

  const parsed = progressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;
  // AniList has no seasons; a season sent for anime is ignored, not stored.
  const season = target.type === "anime" ? 1 : body.season;

  // PUT sets the progress to a value rather than adding to it, so a retried
  // or double-clicked request lands in the same state. The upsert makes that
  // true under concurrency too: two first-time requests can't both insert.
  const values = {
    season,
    episode: body.episode,
    title: body.title,
    posterUrl: body.posterUrl ?? null,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(episodeProgress)
    .values({ userId, mediaType: target.type, mediaId: target.id, ...values })
    .onConflictDoUpdate({
      target: [episodeProgress.userId, episodeProgress.mediaType, episodeProgress.mediaId],
      set: values,
    })
    .returning();

  return NextResponse.json({ progress: { season: row.season, episode: row.episode } });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId, target } = await resolve(params);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!target) return notFound();

  await db.delete(episodeProgress).where(ownRow(userId, target));
  return new NextResponse(null, { status: 204 });
}
