# Supabase Migration Guide

How to set up Supabase as the Postgres database and sync Clerk users into it.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, give it a name, set a strong database password, and choose a region.
3. Wait for the project to finish provisioning (~1 min).

---

## 2. Get the Connection String

1. In your Supabase dashboard go to **Settings → Database**.
2. Scroll to **Connection string** and select **Transaction mode** (port `6543`).
3. Copy the URI — it looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Paste it into your `.env` as `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

> **Session mode vs Transaction mode** — Use Transaction mode (port `6543`) for serverless/edge deployments. Use Session mode (port `5432`) only for long-lived server processes that need prepared statements.

---

## 3. Run the Database Migrations

### New database

```bash
bun run db:migrate
```

This requires `DATABASE_URL` to be set in your environment. It creates the `drizzle.__drizzle_migrations` table, which records each migration as it's applied, so running it again only applies new ones.

`lib/db/migrations/0000_baseline.sql` creates the whole schema in one go: the enums, `users`, `watchlists` (including `is_public`), `watchlist_items`, and the unique index that stops a title appearing twice in one list.

### Already have a database?

Databases set up before the baseline existed were built by pasting the old `0000`–`0003` SQL files into the SQL Editor. Their schema matches the baseline, but Drizzle has no record of it, so `db:migrate` would try to create tables that already exist.

First check the schema really is current: `watchlists` must have an `is_public` column, and `watchlist_items` must have the `watchlist_items_media_unique` index. If either is missing, apply the old files from git history first (`git show e4a9097:lib/db/migrations/0002_unique_watchlist_items.sql`, and the same for `0003_public_watchlists.sql`).

Then run this once in the SQL Editor to mark the baseline as applied:

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
-- created_at must equal the baseline's "when" in meta/_journal.json: Drizzle
-- skips every migration at or before the newest created_at it finds here.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('39cb27e869d3402a5033e47a81a7f56186eb0f0d8696654b81342ea2856dc9d9', 1791632629494);
```

From then on, `bun run db:migrate` only applies migrations generated after the baseline.

---

## 4. Connect Clerk to Supabase via Webhooks

Clerk fires webhook events (`user.created`, `user.updated`, `user.deleted`) whenever a user's account changes. The webhook handler at `/api/webhooks/clerk` listens for these and keeps the `users` table in sync.

### Step 1 — Get your public URL

The webhook endpoint must be publicly reachable. For local development use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# → Forwarding: https://abc123.ngrok-free.app
```

For production, use your deployed domain (e.g. `https://nexttobinge.vercel.app`).

### Step 2 — Register the webhook in Clerk

1. Open [dashboard.clerk.com](https://dashboard.clerk.com) → your application → **Webhooks**.
2. Click **Add Endpoint**.
3. Set the URL to:
   ```
   https://<your-domain>/api/webhooks/clerk
   ```
4. Under **Message Filtering**, subscribe to these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Click **Create**.

### Step 3 — Copy the Signing Secret

After creating the endpoint, Clerk shows a **Signing Secret** that starts with `whsec_`.

Add it to your `.env`:
```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### Step 4 — Test the webhook

1. Start your dev server: `bun dev`
2. Start ngrok (if local): `ngrok http 3000`
3. In the Clerk dashboard, open the webhook endpoint and click **Send test event** (choose `user.created`).
4. You should see a `200 OK` response and a new row appear in the Supabase `users` table.

---

## 5. Verify Data Flow

Open **Supabase → Table Editor → users** and confirm a row exists after a Clerk sign-up.

You can also query it in **SQL Editor**:
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

---

## 6. Environment Variables Summary

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (Transaction mode) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → your endpoint → Signing Secret |
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |

---

## 7. Users Table Schema

```sql
CREATE TABLE "users" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_id"   text NOT NULL UNIQUE,   -- Clerk's user ID (e.g. user_2abc...)
  "email"      text NOT NULL UNIQUE,
  "name"       text,
  "image_url"  text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

The `clerk_id` is the bridge between Clerk sessions (used in API routes via `auth().userId`) and your Supabase data. The `watchlists.user_id` column stores this same Clerk ID so no join is required for standard queries.

---

## 8. How the Webhook Route Works

`app/api/webhooks/clerk/route.ts`:

- Reads the `svix-*` headers Clerk attaches to every webhook request.
- Verifies the signature with `svix` using `CLERK_WEBHOOK_SECRET` — rejects anything that doesn't pass.
- Routes the verified event to the correct DB operation:
  - `user.created` → `INSERT INTO users`
  - `user.updated` → `UPDATE users SET ... WHERE clerk_id = ?`
  - `user.deleted` → `DELETE FROM users WHERE clerk_id = ?`
- The route is excluded from Clerk's auth proxy (listed as a public route in `proxy.ts`) so Clerk itself can reach it without a session token.
