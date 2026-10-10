import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, watchlists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { expirePublicList } from "@/lib/public-lists";

function getPrimaryEmail(data: UserJSON): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

function getFullName(data: UserJSON): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function POST(req: NextRequest) {
  // Checks the svix-* signature headers against the signing secret and the
  // timestamp against replays. Throws on anything missing or wrong.
  let event: WebhookEvent;
  try {
    event = await verifyWebhook(req, { signingSecret: env.CLERK_WEBHOOK_SECRET });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { data } = event;
    await db.insert(users).values({
      clerkId: data.id,
      email: getPrimaryEmail(data),
      name: getFullName(data),
      imageUrl: data.image_url,
    });
  }

  if (event.type === "user.updated") {
    const { data } = event;
    await db
      .update(users)
      .set({
        email: getPrimaryEmail(data),
        name: getFullName(data),
        imageUrl: data.image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, data.id));
  }

  // Clerk types the deleted user's id as optional; without one there is
  // nothing to delete.
  if (event.type === "user.deleted" && event.data.id) {
    const userId = event.data.id;
    // watchlists.user_id holds the Clerk id with no foreign key to users, so
    // deleting the user row alone would leave their lists behind, public ones
    // still served at /lists/<id>. Items go with their list (ON DELETE CASCADE).
    const deletedLists = await db.transaction(async (tx) => {
      const lists = await tx
        .delete(watchlists)
        .where(eq(watchlists.userId, userId))
        .returning({ id: watchlists.id });
      await tx.delete(users).where(eq(users.clerkId, userId));
      return lists;
    });
    // Shared pages are cached; a deleted account's lists must stop being
    // served now, not at the next hourly revalidation.
    for (const list of deletedLists) expirePublicList(list.id);
  }

  return NextResponse.json({ received: true });
}
