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

### Option A — Supabase SQL Editor (recommended for first setup)

Paste each file in order into **SQL Editor → New query**:

1. `lib/db/migrations/0000_initial.sql` — creates enums, `watchlists`, `watchlist_items`
2. `lib/db/migrations/0001_users.sql` — creates the `users` table

Click **Run** after each one.

### Option B — Drizzle Kit CLI

```bash
bun run db:migrate
```

This requires `DATABASE_URL` to be set in your environment and uses the Session mode connection (port `5432`).

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
- The route is excluded from Clerk's auth middleware (listed as a public route in `middleware.ts`) so Clerk itself can reach it without a session token.
