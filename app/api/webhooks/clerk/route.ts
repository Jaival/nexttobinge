import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, watchlists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { expirePublicList } from "@/lib/public-lists";

type EmailAddress = { email_address: string; id: string };

type ClerkUserEventData = {
  id: string;
  email_addresses: EmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
};

type ClerkWebhookEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: ClerkUserEventData & { deleted?: boolean };
};

function getPrimaryEmail(data: ClerkUserEventData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

function getFullName(data: ClerkUserEventData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created") {
    await db.insert(users).values({
      clerkId: data.id,
      email: getPrimaryEmail(data),
      name: getFullName(data),
      imageUrl: data.image_url,
    });
  }

  if (type === "user.updated") {
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

  if (type === "user.deleted") {
    // watchlists.user_id holds the Clerk id with no foreign key to users, so
    // deleting the user row alone would leave their lists behind, public ones
    // still served at /lists/<id>. Items go with their list (ON DELETE CASCADE).
    const deletedLists = await db.transaction(async (tx) => {
      const lists = await tx
        .delete(watchlists)
        .where(eq(watchlists.userId, data.id))
        .returning({ id: watchlists.id });
      await tx.delete(users).where(eq(users.clerkId, data.id));
      return lists;
    });
    // Shared pages are cached; a deleted account's lists must stop being
    // served now, not at the next hourly revalidation.
    for (const list of deletedLists) expirePublicList(list.id);
  }

  return NextResponse.json({ received: true });
}
