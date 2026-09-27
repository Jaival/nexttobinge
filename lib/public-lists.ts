import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { isPosterUrl } from "@/lib/guest-watchlist-rules";
import type { MediaCardItem, MediaType } from "@/components/media-card";

// Public, read-only views of watchlists their owners chose to share.
//
// A shared link can go viral: one Discord post, a few thousand clicks. So the
// data is cached, and every write that changes what a visitor would see
// invalidates it by tag (see refreshPublicList / expirePublicList).

export function publicListPath(id: string) {
  return `/lists/${id}`;
}

function listTag(id: string) {
  return `list:${id}`;
}

export interface PublicList {
  id: string;
  name: string;
  description: string | null;
  /** First name only, and only because the owner chose to publish the list. */
  ownerName: string | null;
  items: MediaCardItem[];
}

async function getOwnerName(userId: string) {
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.firstName ?? user.username ?? null;
  } catch {
    // A missing name costs one line of text, not the page.
    return null;
  }
}

async function loadPublicList(id: string): Promise<PublicList | null> {
  // isPublic is part of the query, not checked afterwards: a private list is
  // never loaded into this code path at all.
  const list = await db.query.watchlists.findFirst({
    where: and(eq(watchlists.id, id), eq(watchlists.isPublic, true)),
    columns: { id: true, name: true, description: true, userId: true },
  });
  if (!list) return null;

  const [rows, ownerName] = await Promise.all([
    db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.watchlistId, id))
      .orderBy(asc(watchlistItems.addedAt)),
    getOwnerName(list.userId),
  ]);

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    ownerName,
    // Watch status stays private: sharing a list shouldn't reveal what the
    // owner has or hasn't watched yet.
    items: rows.map((row) => ({
      id: Number(row.mediaId),
      title: row.title,
      // Older rows were saved before poster URLs were validated. The preview
      // image fetches these on the server, so only known image hosts pass.
      posterUrl: isPosterUrl(row.posterUrl) ? row.posterUrl : null,
      year: row.releaseYear,
      rating: row.rating ? Number(row.rating) : null,
      type: row.mediaType as MediaType,
    })),
  };
}

/**
 * A public list, or null if it doesn't exist or is private.
 *
 * Cached in the Data Cache under a per-list tag. `cache()` on top shares one
 * lookup between generateMetadata and the page within a single render.
 * The hourly revalidate is a safety net for changes made outside the app,
 * such as an owner renaming themselves in Clerk.
 */
export const getPublicList = cache((id: string) =>
  unstable_cache(() => loadPublicList(id), ["public-list", id], {
    tags: [listTag(id)],
    revalidate: 3600,
  })()
);

/**
 * The list's content changed (renamed, item added or removed). The next
 * visitor may still get the old copy while a fresh one renders in the
 * background (stale-while-revalidate). Harmless for content.
 */
export function refreshPublicList(id: string) {
  revalidateTag(listTag(id), "max");
}

/**
 * Who can see the list changed (made public or private, or deleted). A stale
 * copy is not acceptable here: a list made private must stop being served
 * immediately, and a list made public shouldn't 404 for the owner's first
 * click. So the entry is expired outright.
 */
export function expirePublicList(id: string) {
  revalidateTag(listTag(id), { expire: 0 });
}
