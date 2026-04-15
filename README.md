# NextToBinge

Discover movies, dramas, and anime — save them into personal watchlists.

Built with Next.js 16 (App Router), Clerk, Supabase, Drizzle ORM, TMDB, AniList, and shadcn/ui.

## Features

- Browse trending and popular **movies**, **TV dramas**, and **anime**
- **Search** across all three categories at once
- View detailed pages with cast, ratings, genres, and related content
- **Sign in** securely with Clerk (Google, GitHub, email, etc.)
- Create and manage **multiple watchlists**
- Add any title to a watchlist and track its status: Plan to Watch, Watching, or Watched
- Remove items and rename or delete watchlists

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Auth | Clerk |
| Database | Supabase (Postgres) |
| ORM | Drizzle ORM |
| Content — Movies/Dramas | [TMDB API](https://www.themoviedb.org/) (free) |
| Content — Anime | [AniList GraphQL API](https://anilist.co/) (free, no key needed) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Language | TypeScript |

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-user/nexttobinge
cd nexttobinge
bun install
```

### 2. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk dashboard](https://clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | [Clerk dashboard](https://clerk.com) → API Keys |
| `DATABASE_URL` | [Supabase](https://supabase.com) → Project Settings → Database → Connection string (Transaction mode) |
| `TMDB_API_KEY` | [TMDB](https://www.themoviedb.org/settings/api) → API → Developer |

AniList requires no API key.

### 3. Set up the database

Run the migration SQL in your Supabase project's **SQL Editor**:

```bash
# Contents are in:
lib/db/migrations/0000_initial.sql
```

Or if you prefer to generate and push via Drizzle Kit (requires `DATABASE_URL` in your shell):

```bash
bun run db:generate
bun run db:migrate
```

### 4. Run the development server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
  (auth)/           Sign-in and sign-up pages (Clerk hosted UI)
  (main)/           Main app layout (Navbar + content)
    page.tsx        Home — trending content
    browse/         Movies, Dramas, Anime browse pages
    search/         Unified search across all types
    media/          Detail pages for movie, tv, anime
    watchlists/     Watchlist management pages
  api/watchlists/   REST API routes (CRUD for watchlists and items)
components/         Shared UI components
lib/
  db/               Drizzle schema, client, and migrations
  tmdb.ts           TMDB API helpers
  anilist.ts        AniList GraphQL helpers
middleware.ts       Clerk auth — protects all routes except home and auth
```

## Available Scripts

```bash
bun dev           # Start development server
bun run build     # Production build
bun run lint      # Run ESLint
bun run db:generate   # Generate Drizzle migrations from schema
bun run db:migrate    # Apply migrations to the database
bun run db:studio     # Open Drizzle Studio (visual DB browser)
```

## Deployment

The app is ready to deploy on [Vercel](https://vercel.com). Add the same environment variables from `.env.local` to your Vercel project settings, then push to deploy.
