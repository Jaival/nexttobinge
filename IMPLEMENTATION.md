# Implementation Notes

A full record of everything built for the NextToBinge app.

## Dependencies Added

### Runtime
| Package | Purpose |
|---|---|
| `@clerk/nextjs` | Authentication (sign in, sign up, session, middleware) |
| `drizzle-orm` | Type-safe ORM for Postgres |
| `postgres` | Postgres driver used by Drizzle |
| `sonner` | Toast notifications (added via shadcn) |

### Dev
| Package | Purpose |
|---|---|
| `drizzle-kit` | CLI for generating and running Drizzle migrations |

### shadcn/ui Components Added
`card` · `input` · `badge` · `dialog` · `tabs` · `select` · `skeleton` · `avatar` · `separator` · `scroll-area` · `sonner` · `dropdown-menu`

---

## Environment Variables

Defined in `env.ts` using `@t3-oss/env-nextjs` with Zod validation. A `.env.local.example` file is provided.

| Variable | Type | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | Clerk publishable key |
| `CLERK_SECRET_KEY` | server | Clerk secret key |
| `DATABASE_URL` | server | Supabase Postgres connection string |
| `TMDB_API_KEY` | server | TMDB REST API key |
| `SITE_URL` | server | Optional public origin for canonical URLs, sitemap and OG tags (see `lib/seo.ts`) |

---

## Authentication — Clerk

**Files:**
- `proxy.ts` (Next.js 16's name for middleware) — uses `clerkMiddleware` + `createRouteMatcher`; browsing, detail pages and search are public, only watchlists (pages and API) require sign-in
- `app/layout.tsx` — wraps the entire app in `<ClerkProvider>`
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — renders Clerk's hosted `<SignIn />` component
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — renders Clerk's hosted `<SignUp />` component

The `UserButton` (avatar + dropdown for account management) appears in the Navbar on every page.

---

## Database — Drizzle ORM + Supabase

### Schema (`lib/db/schema.ts`)

**`watchlists` table**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `user_id` | text | Clerk user ID |
| `name` | text | Watchlist name |
| `description` | text | Optional description |
| `created_at` | timestamp | Auto-set on insert |
| `updated_at` | timestamp | Auto-set on insert |

**`watchlist_items` table**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `watchlist_id` | uuid | Foreign key → `watchlists.id` (cascade delete) |
| `media_type` | enum | `movie` \| `tv` \| `anime` |
| `media_id` | text | ID from TMDB or AniList |
| `title` | text | Cached title |
| `poster_url` | text | Cached poster URL |
| `release_year` | text | Cached year |
| `rating` | text | Cached rating score |
| `status` | enum | `plan` \| `watching` \| `watched` |
| `added_at` | timestamp | Auto-set on insert |

**Enums:** `media_type`, `watch_status`

### Client (`lib/db/index.ts`)
Single Drizzle client instance connected to Supabase via the `DATABASE_URL` env var.

### Migrations
- `lib/db/migrations/0000_initial.sql` — raw SQL ready to paste into Supabase SQL Editor
- `lib/db/migrations/0001_users.sql` — `users` table
- `lib/db/migrations/0002_unique_watchlist_items.sql` — removes duplicate items, then adds a unique index on `(watchlist_id, media_type, media_id)`
- `lib/db/migrations/0003_public_watchlists.sql` — `is_public boolean not null default false` on `watchlists`
- `drizzle.config.ts` — Drizzle Kit config pointing at the schema and migrations folder
- Scripts: `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`

---

## Content APIs

### TMDB (`lib/tmdb.ts`)
Typed helpers over the TMDB REST API (v3). All responses are cached for 1 hour via `next: { revalidate: 3600 }`.

| Function | Endpoint |
|---|---|
| `getTrendingMovies` | `/trending/movie/week` |
| `getTrendingTV` | `/trending/tv/week` |
| `discoverMovies` | `/discover/movie` |
| `discoverTV` | `/discover/tv` |
| `searchMovies` | `/search/movie` |
| `searchTV` | `/search/tv` |
| `getMovieDetails` | `/movie/{id}` |
| `getTVDetails` | `/tv/{id}` |
| `getMovieCredits` | `/movie/{id}/credits` |
| `getTVCredits` | `/tv/{id}/credits` |
| `getSimilarMovies` | `/movie/{id}/similar` |
| `getSimilarTV` | `/tv/{id}/similar` |
| `getMovieGenres` | `/genre/movie/list` |
| `getTVGenres` | `/genre/tv/list` |
| `posterUrl` / `backdropUrl` | Helpers to build full image URLs |

### AniList (`lib/anilist.ts`)
Typed GraphQL queries against the AniList public API (no key required). Also cached for 1 hour.

| Function | Query |
|---|---|
| `getTrendingAnime` | Trending anime, paginated |
| `getPopularAnime` | Most popular anime, paginated |
| `searchAnime` | Full-text search |
| `getAnimeDetails` | Full detail with characters and relations |
| `getAnimeTitle` | Helper — English title, falls back to Romaji |

---

## Shared Components

### `components/navbar.tsx`
- Sticky top bar with backdrop blur
- Logo linking to `/`
- Navigation links: Movies, Dramas, Anime, Watchlists (with icons)
- Inline search form that navigates to `/search?q=...`
- Clerk `<UserButton />` for account management
- Mobile-friendly bottom nav row for small screens
- Active link highlighting based on current pathname

### `components/media-card.tsx`
- Displays a poster image (with `next/image`), title, type badge, and year
- Hover: scales image, shows overlay gradient and rating badge
- `+` button (visible on hover) triggers the WatchlistDialog
- `MediaCardSkeleton` — animated placeholder for loading states
- Exported `MediaCardItem` type used across the whole app

### `components/media-grid.tsx`
- Responsive 2→3→4→5 column grid
- Manages WatchlistDialog open state
- Shows skeletons when `loading={true}`
- Shows an empty state message when `items` is empty

### `components/watchlist-dialog.tsx`
- Dialog that lists the user's watchlists fetched from the API
- Click a watchlist to add the item; shows a toast on success
- Detects duplicates (`already_exists` response) and shows an info toast
- Inline "create new watchlist" form at the bottom
- Loading skeletons while fetching

### `components/add-to-watchlist-button.tsx`
- Standalone button used on detail pages
- Opens WatchlistDialog with the current media item pre-filled

### `components/browse-page-client.tsx`
- Wraps MediaGrid with Previous / Next pagination buttons
- Reads and updates the `?page=` search param via `useRouter`
- Caps total pages at 500 (TMDB limit)

---

## Route Structure

```
app/
  (auth)/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
  (main)/
    layout.tsx                          Navbar + Toaster shell
    page.tsx                            Home page
    browse/
      movies/page.tsx
      dramas/page.tsx
      anime/page.tsx
    search/page.tsx
    media/
      movie/[id]/page.tsx
      tv/[id]/page.tsx
      anime/[id]/page.tsx
    watchlists/
      page.tsx
      watchlists-client.tsx
      [id]/
        page.tsx
        watchlist-detail-client.tsx
  api/
    watchlists/
      route.ts                          GET list, POST create
      [id]/
        route.ts                        PATCH rename, DELETE
        items/
          route.ts                      GET items, POST add, DELETE remove
          [itemId]/
            route.ts                    PATCH update status
proxy.ts
```

---

## Pages

### Home (`/`)
Server component. Fetches trending movies, TV, and anime in parallel. Renders three horizontal sections, each with a "View all" link to the browse page.

### Browse — Movies (`/browse/movies`)
Server component. Reads `?page` from search params, calls `discoverMovies`. Passes results to `BrowsePageClient` for pagination.

### Browse — Dramas (`/browse/dramas`)
Same pattern as Movies using `discoverTV`.

### Browse — Anime (`/browse/anime`)
Same pattern using `getTrendingAnime` from AniList.

### Search (`/search?q=...`)
Server component. Runs `searchMovies`, `searchTV`, and `searchAnime` in parallel. Results displayed in a Tabs component — All, Movies, Dramas, Anime — with counts on each tab.

### Movie Detail (`/media/movie/[id]`)
Fetches movie details, cast, and similar movies in parallel. Displays backdrop image with gradient overlay, poster, metadata (year, runtime, rating, genres, status, tagline), overview, cast row, and similar movies grid.

### Drama Detail (`/media/tv/[id]`)
Same structure as Movie Detail. Shows seasons/episodes count instead of runtime.

### Anime Detail (`/media/anime/[id]`)
Uses AniList data. Shows banner image, cover, native title, season info, episode count, studio, genres, characters row, and related works grid. HTML tags stripped from AniList's description field.

### Watchlists (`/watchlists`)
Split into a server component (data fetch) and a client component (`WatchlistsClient`). Displays watchlists as Cards with item counts. Supports create (Dialog), rename (Dialog), and delete (confirm prompt) — all with optimistic UI updates and toast feedback.

### Watchlist Detail (`/watchlists/[id]`)
Split into a server component and `WatchlistDetailClient`. Lists all items with poster, title, type, year, and rating. Filter bar to view by status (All / Plan to Watch / Watching / Watched). Per-item status Select dropdown and remove button. All changes reflected immediately with toasts.

---

## API Routes

All routes are protected — they call `auth()` from `@clerk/nextjs/server` and return 401 if no session.

| Method | Route | Action |
|---|---|---|
| `GET` | `/api/watchlists` | List user's watchlists (ordered by created_at desc) |
| `POST` | `/api/watchlists` | Create a watchlist |
| `PATCH` | `/api/watchlists/[id]` | Rename a watchlist |
| `DELETE` | `/api/watchlists/[id]` | Delete a watchlist (cascades to items) |
| `GET` | `/api/watchlists/[id]/items` | List items in a watchlist |
| `POST` | `/api/watchlists/[id]/items` | Add an item (returns 409 if duplicate) |
| `DELETE` | `/api/watchlists/[id]/items?itemId=` | Remove an item |
| `PATCH` | `/api/watchlists/[id]/items/[itemId]` | Update an item's watch status |
| `POST` | `/api/watchlists/import` | Move a guest (localStorage) watchlist into "My watchlist"; idempotent |
| `POST` | `/api/watchlists/[id]/copy` | Copy a public (or your own) list into your account |
| `GET` | `/api/recommendations` | "Because you saved…" rows; `Cache-Control: private, max-age=60` |

All write routes verify ownership by checking `user_id = userId` before acting.

---

## Next.js Configuration (`next.config.ts`)

Added `images.remotePatterns` to allow images from:
- `image.tmdb.org` — TMDB posters and backdrops
- `s4.anilist.co` — AniList cover and banner images

---

## SEO

See ROADMAP.md, Phase 1, for the reasoning behind each piece.

| File | What it does |
|---|---|
| `lib/seo.ts` | `SITE_URL`, description trimming, `mediaMetadata()` for detail pages, `browseMetadata()` for paginated grids |
| `components/json-ld.tsx` | Renders schema.org structured data with `<` escaped |
| `app/layout.tsx` | `metadataBase`, title template (`%s · NextToBinge`), default Open Graph / Twitter tags |
| `app/opengraph-image.tsx` | Default 1200×630 link-preview image, generated at build time |
| `app/robots.ts` | `/robots.txt`: disallows `/api/`, `/watchlists`, sign-in and sign-up |
| `app/sitemap.ts` | `/sitemap.xml`: static routes plus ~600 popular movies, series and anime; revalidates hourly |
| Detail pages | `generateMetadata` (title, description, canonical, OG images) and `Movie` / `TVSeries` JSON-LD |
| `app/(main)/search/page.tsx` | `noindex, follow` |
| `app/(main)/watchlists/layout.tsx` | `noindex, nofollow` |
| `proxy.ts` | `/robots.txt`, `/sitemap.xml` and `/opengraph-image` are public routes |

`getAnimeDetails` is wrapped in React `cache()` because AniList requests are POSTs, which Next.js does not memoize, and both the page and `generateMetadata` need the data.

---

## Guest mode, where to watch, trailers

See ROADMAP.md, Phase 3, for the reasoning behind each piece.

| File | What it does |
|---|---|
| `lib/guest-watchlist.ts` | `localStorage` store for signed-out visitors (`useGuestWatchlist`, `addGuestItem`, `removeGuestItems`), synced across tabs |
| `lib/guest-watchlist-rules.ts` | `GUEST_LIMIT` (50) and `isPosterUrl()`, shared by the browser store and the import route. No React, so server code can import it |
| `components/watchlist-dialog.tsx` | `useAddToWatchlist()`: opens the dialog when signed in, saves to the guest list otherwise |
| `app/(main)/watchlists/guest-watchlist.tsx` | `/watchlists` for signed-out visitors, with a sign-up prompt |
| `components/guest-watchlist-sync.tsx` | After sign-in, POSTs the guest list to `/api/watchlists/import` and clears only what was sent |
| `lib/country.ts`, `app/actions/country.ts` | Viewer's country: `ntb-country` cookie, then `x-vercel-ip-country` / `cf-ipcountry`, then `US` |
| `components/where-to-watch.tsx` | Stream / rent / buy providers (TMDB, via JustWatch) and AniList streaming links |
| `components/country-select.tsx` | Country picker that calls the `setCountry` Server Action |
| `components/trailer-button.tsx` | YouTube trailer in a dialog; the iframe only mounts while open |
| `lib/tmdb.ts` | Detail requests use `append_to_response=videos,watch/providers`; `pickTrailer()` |

---

## Recommendations, mood picker, filters, collections

See ROADMAP.md, Phase 4.

| File | What it does |
|---|---|
| `app/api/recommendations/route.ts`, `components/recommendations.tsx` | Up to 3 home-page rows seeded from the user's latest saves, fetched client-side so `/` stays static |
| `lib/tonight.ts`, `app/(main)/tonight/page.tsx` | `/tonight`: mood × type × length → 3 picks, deterministic per `seed` |
| `lib/browse-filters.ts`, `components/browse-filters.tsx` | Sort / genre / year / rating (format for anime) on browse pages, stored in the URL. Filtered pages are `noindex, follow` |
| `lib/collections.ts`, `app/(main)/collections/` | 10 curated lists, pre-rendered with `generateStaticParams`, with `ItemList` JSON-LD and sitemap entries |
| `lib/media-cards.ts` | `movieToCard` / `tvToCard` / `animeToCard` mappers shared by every grid |
| `components/chip-link.tsx` | Pill-shaped link used by `/tonight` and the collection pages |

---

## Shareable public lists

See ROADMAP.md, Phase 2.

| File | What it does |
|---|---|
| `lib/public-lists.ts` | `getPublicList()` (Data Cache, tag `list:<id>`), `refreshPublicList()` (stale-while-revalidate) and `expirePublicList()` (immediate) |
| `app/(main)/lists/[id]/page.tsx` | Public, read-only list at `/lists/<id>`; ISR via `generateStaticParams() => []`; `noindex, follow` |
| `app/(main)/lists/[id]/opengraph-image.tsx` | Link-preview card (list name + 4 posters), converted to JPEG with `sharp` |
| `app/(main)/lists/[id]/save-copy-button.tsx` | Sign-up modal when signed out, `POST /api/watchlists/[id]/copy` when signed in |
| `app/(main)/watchlists/[id]/share-dialog.tsx` | Owner's "Public link" switch (`PATCH /api/watchlists/[id]` with `isPublic`) |
| `components/share-link-button.tsx` | `navigator.share()` on touch devices, clipboard elsewhere |
| `lib/utils.ts` | `isUuid()`: malformed ids become 404s instead of Postgres errors |

The watchlist write routes validate their bodies with zod and invalidate the list's cache tag. Changing `isPublic` or deleting a list expires it immediately; content edits use stale-while-revalidate.
