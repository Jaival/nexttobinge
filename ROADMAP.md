# NextToBinge Roadmap

The plan for growing NextToBinge from "a site that works" to "a site people find, share, and come back to". Each feature says what it is, why it brings in users, how to build it, and which DevOps / cloud concepts you practise by building it.

Status: ✅ done · 🔜 next · ⬜ planned

---

## The mental model: a growth funnel

Every feature here moves people through one step of this funnel. If a feature doesn't help a step, it waits.

```
  FIND   →   SHARE   →   TRY    →   STAY
  SEO        public      guest      progress,
             lists,      lists,     ratings,
             previews    trailers   alerts
```

| Phase | Funnel step | Features | Status |
|---|---|---|---|
| 0 | Foundations | CI, monitoring, analytics, TMDB attribution | 🔜 |
| 1 | Find | SEO: metadata, sitemap, structured data, link previews | ✅ |
| 2 | Share | Public watchlists with generated preview images | ✅ |
| 3 | Try | Guest watchlist, where to watch, trailers | ✅ |
| 4 | Engage | Recommendations, mood picker, filters and collections | ✅ |
| 5 | Stay | Episode progress, ratings, anime calendar, imports, PWA + notifications, year in review | ⬜ |
| 6 | Community | Follow friends, activity feed | ⬜ |

Build phases in order. Each one feeds the next: SEO brings visitors, sharing multiplies them, guest lists convert them, and retention features keep them.

---

## Phase 0: Foundations (the DevOps track)

These don't attract users directly. They let you ship the rest safely and tell whether it's working. Phases 1 to 4 are done, so these come next, before Phase 5.

### 0.1 CI pipeline (GitHub Actions)
- **What:** on every push and pull request, run `bun install`, `bun run lint`, `tsc --noEmit` and `bun run build`.
- **Why:** a broken build should fail in a PR, not in production.
- **How:** `.github/workflows/ci.yml`. Store the env vars the build needs as GitHub Actions secrets. The build calls TMDB (see the sitemap), so it needs a real `TMDB_API_KEY`.
- **You'll learn:** CI/CD pipelines, secrets management, dependency caching (`actions/cache` on `~/.bun/install/cache`), required status checks and branch protection.

### 0.2 Preview deployments
- **What:** every PR gets its own URL (Vercel does this automatically once the repo is connected).
- **You'll learn:** environments (development / preview / production), per-environment env vars, why preview deploys should use a separate database or branch (Supabase branching).

### 0.3 Analytics and Search Console
- **What:** Google Search Console for search traffic; privacy-friendly analytics (Vercel Web Analytics, Plausible or PostHog) for visits and sign-ups.
- **Why:** without numbers you can't tell which features actually attract users.
- **You'll learn:** DNS TXT records (domain verification), event tracking, funnels.

### 0.4 Error monitoring
- **What:** Sentry (or similar) for server and client errors.
- **Why:** TMDB and AniList are third-party APIs that sometimes fail or rate-limit. You want to know before your users tell you.
- **You'll learn:** observability, source maps, alerting and noise control.

### 0.5 TMDB attribution (required)
- **What:** a footer with the TMDB logo and "This product uses the TMDB API but is not endorsed or certified by TMDB."
- **Why:** it's a condition of TMDB's API terms. Once more users arrive, don't risk losing your key.

---

## Phase 1: SEO ✅

**Goal:** turn the thousands of public title pages you already have into search results. When someone searches "*Frieren where to watch*" or "*Dune Part Two cast*", NextToBinge should be able to appear.

### How search engines work (the 60-second version)

1. **Crawl:** Googlebot downloads your pages. It finds URLs from links and from your sitemap.
2. **Render:** it runs the page and reads the HTML, including the `<head>`.
3. **Index:** it decides what the page is about and whether to store it. Duplicates and thin pages are dropped.
4. **Rank:** for each search it orders indexed pages by relevance and quality.

Before this phase, every page had the same `<title>`: "NextToBinge — Discover Movies, Series & Anime". To Google, 10,000 pages looked like 10,000 copies of the home page. Each piece below fixes one step of that pipeline.

### What was built, and why

| Piece | File | Funnel step it fixes |
|---|---|---|
| Per-page title and description | `generateMetadata` in each detail page, `lib/seo.ts` | Index and rank: each page now says what it is |
| Title template | `app/layout.tsx` | Brand on every result: "Dune: Part Two (2024) · NextToBinge" |
| Canonical URLs | `alternates.canonical` | Index: one official URL per page |
| Open Graph / Twitter tags | `mediaMetadata()` | Share: rich previews in Discord, WhatsApp, X |
| Default preview image | `app/opengraph-image.tsx` | Share: the home page and browse pages get a branded card |
| Structured data (JSON-LD) | `components/json-ld.tsx` | Rank: Google knows it's a *Movie* with actors, runtime, genres |
| Sitemap | `app/sitemap.ts` | Crawl: ~600 popular titles handed to Google directly |
| robots.txt | `app/robots.ts` | Crawl: stop wasting crawl budget on sign-in redirects |
| `noindex` on search and watchlists | search page, `watchlists/layout.tsx` | Index: keep thin and private pages out |

### Concepts worth understanding

**`metadataBase` and `SITE_URL`.** Tags like `<link rel="canonical">` and `og:image` need absolute URLs (`https://…`), but the code only knows paths (`/media/movie/1`). `metadataBase` is the prefix Next.js adds. It comes from the `SITE_URL` env var, falling back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then localhost.
> 🛠 **DevOps lesson:** the same code produces different output per environment, and config comes from the environment, not the code (the [twelve-factor app](https://12factor.net/config) principle). If production ever shows `localhost` in its sitemap, the env var is missing.

**Why the canonical is not in the root layout.** Metadata is inherited. A canonical of `/` in `app/layout.tsx` would make every page claim to be the home page, and Google would drop them all as duplicates. That's why it lives on `app/(main)/page.tsx` only.

**Why `openGraph` repeats `siteName`.** Child metadata objects replace their parent's `openGraph` completely instead of merging with it. `mediaMetadata()` rebuilds the whole object, so nothing gets lost.

**Pagination canonicals.** `/browse/anime?page=3` has a canonical pointing to itself, not to page 1. Pointing it at page 1 would tell Google that page 3's titles don't exist.

**`noindex` vs `robots.txt`.** They sound similar but do different jobs:
- `robots.txt` `Disallow` means "don't *crawl* this". Google may still index the bare URL if other sites link to it.
- `<meta name="robots" content="noindex">` means "don't *index* this". Google has to crawl the page to see that tag.

So search pages use `noindex` and are *not* blocked in robots.txt. If robots.txt blocked them, Google would never see the noindex tag.

**Structured data (JSON-LD).** A hidden `<script type="application/ld+json">` describing the page in the [schema.org](https://schema.org) vocabulary. We deliberately don't include `aggregateRating`: those scores come from TMDB and AniList, not from your users, and Google's review-snippet guidelines don't allow marking up ratings collected elsewhere. That changes once users rate titles themselves (Phase 5).
The `<` → `\u003c` escaping stops a synopsis containing `</script>` from breaking out of the tag. That would be a stored XSS bug.

**Caching: three layers working together.**
1. *Data cache:* `fetch(..., { next: { revalidate: 3600 } })` in `lib/tmdb.ts` keeps TMDB responses for an hour across requests and users.
2. *Request memoization:* within a single render, identical GET `fetch` calls are made only once, so `generateMetadata` and the page share one TMDB request.
3. *React `cache()`:* AniList is GraphQL over **POST**, which Next.js doesn't memoize, so `getAnimeDetails` is wrapped in `cache()` manually. Without it, adding metadata would have doubled the traffic to AniList, which rate-limits at about 90 requests per minute.
> 🛠 **DevOps lesson:** every new feature changes your load on upstream APIs. Know each API's rate limits and your cache hit rate.

**The sitemap is ISR (incremental static regeneration).** The build output shows `/sitemap.xml` with a 1-hour revalidate. It's generated at build time, served from the CDN, and rebuilt in the background at most once an hour. It uses `Promise.allSettled`, so a TMDB outage returns a smaller sitemap instead of failing the build.
> 🛠 **DevOps lesson:** a build that depends on a third-party API being up is fragile. Degrade gracefully.

**The middleware gotcha.** `proxy.ts` (Clerk) treats every route not on its public list as private. `/robots.txt`, `/sitemap.xml` and `/opengraph-image` had to be added to that list, or Googlebot would have been redirected to the sign-in page.
> 🛠 **DevOps lesson:** after adding any new public endpoint, test it **as an anonymous client** (`curl` with no cookies), not in a browser where you're signed in.

### How it was verified
```bash
bun run build && bunx next start -p 3107
UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
curl -A "$UA" localhost:3107/robots.txt
curl -A "$UA" localhost:3107/sitemap.xml | grep -c "<url>"   # ~590
curl -A "$UA" localhost:3107/media/movie/693134 | grep -E "<title>|canonical|og:|ld\+json"
```

### After you deploy: checklist
1. Set `SITE_URL=https://your-domain` in Vercel for the **Production** environment, then redeploy.
2. Open `https://your-domain/robots.txt` and `/sitemap.xml` and check the URLs show your domain, not localhost.
3. Add the domain to [Google Search Console](https://search.google.com/search-console) (DNS TXT verification) and submit `/sitemap.xml`.
4. Paste a movie URL into the [Rich Results Test](https://search.google.com/test/rich-results) to check the structured data.
5. Paste a URL into [opengraph.xyz](https://www.opengraph.xyz/) or a private Discord channel to see the preview card.
6. After 2–4 weeks, check Search Console → Performance for impressions and clicks. That's your baseline for the next phases.

### Possible follow-ups
- More sitemap coverage: split with `generateSitemaps()` into movie, series and anime sitemaps and include more pages.
- Faster first load (Core Web Vitals are a ranking signal): measure with Lighthouse and the Vercel Speed Insights tab.
- Richer title pages (where to watch, trailers) give Google more reasons to rank them. Done in Phase 3.

---

## Phase 2: Shareable public watchlists ✅

**Goal:** turn every user into a distribution channel. A list like "Mind-bending sci-fi for a rainy weekend" pasted into Discord should show its posters and bring new people to the site.

### What was built, and why

| Piece | Files | What it does |
|---|---|---|
| `is_public` column | `lib/db/schema.ts`, `lib/db/migrations/0003_public_watchlists.sql` | Every list is private until its owner turns sharing on |
| Share dialog | `app/(main)/watchlists/[id]/share-dialog.tsx` | A "Public link" switch, plus copy/share and open buttons, on the owner's list page |
| Public page | `app/(main)/lists/[id]/page.tsx`, `lib/public-lists.ts` | `/lists/<id>`: read-only poster grid, owner's first name, "Save a copy" and "Share" |
| Preview image | `app/(main)/lists/[id]/opengraph-image.tsx` | 1200×630 card with the list name and first four posters |
| Save a copy | `app/api/watchlists/[id]/copy/route.ts`, `save-copy-button.tsx` | Signed out: opens sign-up. Signed in: copies the list into your account |
| Share button | `components/share-link-button.tsx` | Native share sheet on phones, copy-to-clipboard on desktop |

### A deliberate change from the plan: `/lists/<id>`, not `/u/<username>/<slug>`
The original plan used readable URLs built from a username and a slug. The final design uses the list's id instead, for three reasons:
- Clerk usernames are optional, so many users wouldn't have one.
- Renaming a list or a user would change the URL and break every link already posted.
- A slug needs its own unique index and collision handling.

The id never changes, so shared links never break. Readable vanity URLs can come later as a redirect *to* the id URL.

### Concepts worth understanding

**Authentication vs authorization.** Authentication answers "who are you?" (Clerk). Authorization answers "what may you do?", and this phase is mostly authorization:
- **Viewing:** anyone may view a list, but only if `is_public` is true. That condition is part of the database query (`WHERE id = ? AND is_public = true`), not an `if` afterwards, so a private list never even loads on the public path.
- **Changing:** only the owner may change a list. Every write has `AND user_id = <you>` in its `WHERE`. Knowing a list's id is not enough.
- **Copying:** you may copy a list if it's public *or* yours.
- **404, not 403.** A private list answers 404. A 403 would confirm that the list exists.

`proxy.ts` makes `/lists/*` public. That only decides who needs to be *signed in*; the page itself decides what they may *see*.
> 🛠 **DevOps lesson:** put authorization as close to the data as possible (in the query), and re-check it on every write. The UI hiding a button is not security.

**Production migrations: expand, then use.** `0003` adds a column with a default. It's *additive*: old code ignores the new column, existing rows become private, and Postgres 11+ adds it without rewriting the table. But deployment order matters. Drizzle names every column in its `SELECT`s, so the **new** code fails on a database that doesn't have the column yet. The rule, and the opposite case:
- **Adding** something: migrate first, then deploy.
- **Removing** something: deploy code that stops using it first, then migrate.

Phase 3's `0002` was written to work both before and after the migration, which is the ideal.
> 🛠 **DevOps lesson:** migrations are tested like code. All four migrations (with a planted duplicate for `0002`) were run against a throwaway local Postgres before any of this touched the real database.

**ISR with on-demand invalidation.** A shared link can get thousands of clicks in an hour. Rendering the page and querying the database each time would be wasted work, so:
1. `generateStaticParams()` returns `[]`: no list is rendered at build time. Each list is rendered on its first visit, then served from the cache (the build shows `●`).
2. The data is cached with `unstable_cache` under a per-list **tag** (`list:<id>`).
3. Every API write calls `revalidateTag` for that list, so the next visit gets fresh data.

**Two kinds of invalidation, on purpose** (`lib/public-lists.ts`):
- **Content changed** (rename, item added or removed): `revalidateTag(tag, "max")`, which is *stale-while-revalidate*. The next visitor may get the old copy once while a new one renders in the background. Seeing a list that's a few seconds old is harmless.
- **Visibility changed** (made private, made public, or deleted): `revalidateTag(tag, { expire: 0 })`, which expires it immediately. A list made private must stop being served *now*. And a list just made public shouldn't show the owner a stale 404.
> 🛠 **DevOps lesson:** a cache is a copy of data that ignores your permissions. When access is revoked, every cached copy has to go. The test showed this: with the list flipped to private directly in the database (no invalidation), the cached page kept being served until `expirePublicList` ran.

The hourly `revalidate` on the cache entry is a safety net for changes that don't go through the API, such as an owner renaming themselves in Clerk.

**The preview image is the product.** `opengraph-image.tsx` renders a card with `ImageResponse` (JSX → Satori → PNG). Some details matter:
- **Posters are pre-fetched with a 3-second timeout** and inlined. One slow or broken image leaves an empty tile instead of failing the whole card.
- **PNG → JPEG with `sharp`.** Posters are photos, which PNG stores at about 524 KB. WhatsApp tends to drop preview images much above 300 KB. JPEG brought it to **54 KB**.
  > 🛠 **DevOps lesson:** measure payloads against the limits of whoever consumes them.
- **Cached like the page** (`●` in the build), and invalidated by the same tag.
- **Link-preview bots cache too.** Discord and WhatsApp keep their own copy of a card for a while, and you can't purge their cache.

**User content → server-side fetch → SSRF.** The preview image *fetches poster URLs on the server*. If an attacker saved a poster URL like `http://169.254.169.254/…` (the cloud metadata address), the server would request it on the attacker's behalf. This is **Server-Side Request Forgery**. There are two defences:
- the add-item API now validates every field with zod, and only accepts poster URLs from the known image hosts;
- rows saved *before* that validation existed are filtered again when read (`isPosterUrl` in `lib/public-lists.ts`).

The test seeded exactly such a row. The page showed an empty tile, and the URL never appeared in the HTML.

**Privacy by default.** Only a list's name, description and titles become public, plus the owner's first name. The share dialog says so before the switch is turned on. *Watch status* ("watched", "watching") is never exposed. Shared lists are `noindex, follow`: user-made content can contain anything, and a list made private again shouldn't linger in Google.

**Bugs fixed along the way:**
- Renaming a list wiped its description, because the API set `description: body.description ?? null`. Now only fields that are actually sent are written.
- A malformed id in any watchlist URL or API call (`/watchlists/abc`) made Postgres throw, which returned a 500. Now it's a clean 404 (`isUuid` in `lib/utils.ts`).
- The add-item API accepted any `mediaType`, and an invalid one crashed on the database enum.

### How it was verified
Against a throwaway local Postgres (PGlite), with the production build:
```text
public list          200 MISS, then 200 HIT        ← ISR cache
private / missing    404                           ← same answer, existence not revealed
not-a-uuid           404                           ← not a 500
anonymous PATCH/copy 401
preview image        200 image/jpeg 54 KB; 404 for a private list
made private (DB only)         200 HIT   ← stale copy: this is why invalidation exists
after expirePublicList         404
made public + expire           200
renamed + refresh ("max")      old title once, then the new one
```
A headless browser clicked "Share" (the link landed on the clipboard) and "Save a copy" while signed out (the sign-up modal opened). It also captured screenshots at 1280px and 390px.

**Not yet verified:** the owner-side flows (share switch, "Save a copy" while signed in) with a real Clerk session. Test them on a preview deployment.

### After you deploy: checklist
1. **First**, run `lib/db/migrations/0003_public_watchlists.sql` in the Supabase SQL editor (and `0002` if you haven't yet). **Then** deploy.
2. Open a list, press **Share** and switch on **Public link**. Open the link in a private window.
3. Paste the link into Discord or WhatsApp and check the poster card appears. To preview without posting, use [opengraph.xyz](https://www.opengraph.xyz).
4. Switch the list back to private and reload the link: it should be a 404 straight away.

### Possible follow-ups
- Vanity URLs (`/u/jaival/sci-fi`) that redirect to the id URL.
- Count views and copies per list (needs Phase 0.3 analytics), and show "Saved 12 times" as social proof.
- Make `Save a copy` idempotent with an idempotency key, so a retried request can't create two copies.
- Load a font with CJK glyphs for preview images, so Japanese and Korean list names don't render as boxes.

---

## Phase 3: Show value before sign-up ✅

**Goal:** let a visitor get real value before being asked for an account, and make title pages answer the question people ask next: "where can I watch it?"

### What was built, and why

| Piece | Files | What it does |
|---|---|---|
| Guest watchlist | `lib/guest-watchlist.ts`, `app/(main)/watchlists/guest-watchlist.tsx` | Signed-out visitors press + and the title is saved in `localStorage`. `/watchlists` shows the list, with a "Sign up to keep it" prompt |
| Guest → account hand-off | `components/guest-watchlist-sync.tsx`, `app/api/watchlists/import/route.ts` | After sign-in, the list is sent to the server and moved into "My watchlist" |
| Unique index | `lib/db/migrations/0002_unique_watchlist_items.sql` | The database refuses a second copy of a title in the same list |
| Where to watch | `components/where-to-watch.tsx`, `lib/country.ts`, `app/actions/country.ts` | Stream / rent / buy logos for the visitor's country, plus a country picker. Anime uses AniList's official streaming links |
| Trailers | `components/trailer-button.tsx`, `pickTrailer()` in `lib/tmdb.ts` | A "Play trailer" button that opens a YouTube player in a dialog |

### Concepts worth understanding

**Why guest mode at all.** Before, the first "+" click opened a sign-in wall, which is where most would-be users leave. Now saving works immediately, and signing up becomes the way to *keep* something you already have rather than a gate in front of something you haven't seen.

**Idempotency.** An operation is idempotent if running it twice has the same effect as running it once. The import has to be: the browser may retry after a timeout, or two open tabs may both run it. Three layers make sure of it:
1. The client clears the guest list only *after* the server confirms. A failed request just retries on the next page load.
2. A Postgres **advisory lock** (`pg_advisory_xact_lock`) makes two imports for the same user take turns, so they can't both create "My watchlist".
3. A **unique index** on `(watchlist_id, media_type, media_id)` plus `ON CONFLICT DO NOTHING` means a duplicate insert becomes a no-op instead of a second row.
> 🛠 **DevOps lesson:** anything that can be retried (webhooks, queue jobs, cron jobs, imports) must be idempotent. Checking "does it exist?" in code is not enough: two requests can both pass the check before either inserts. Only a database constraint closes that race.

**Migrations that clean up first.** A unique index can't be created while duplicates exist, so `0002` deletes duplicates (keeping the oldest row, which holds the user's status) and then creates the index. The import endpoint also filters out existing titles in code, so it stays correct on a database where the migration hasn't run yet. The general rule: deploy code that works both *before and after* a migration, then migrate.

**Never trust the client.** `localStorage` can be edited by anyone with DevTools. The browser store drops malformed entries when reading. The import endpoint validates every field again with zod, caps the list at 50, and only accepts poster URLs from the image hosts `next.config.ts` allows. It's two places enforcing one rule, and the shared constants live in `lib/guest-watchlist-rules.ts`.

**The server/client boundary.** The first build failed. The import route imported `GUEST_LIMIT` from `lib/guest-watchlist.ts`, which also imports a React hook the server can't load. The fix was moving the shared rules into their own module with no React in it.
> 🛠 **DevOps lesson:** this is why CI runs a full `next build`, not only `tsc`. The type checker was happy, but the bundler wasn't.

**Geo at the edge (where to watch).** Vercel's CDN geolocates every request and adds an `x-vercel-ip-country` header (Cloudflare's equivalent is `cf-ipcountry`). `getCountry()` checks three sources in order: the visitor's saved choice (a cookie), that header, then `US`. Locally there's no CDN, so you see the US catalogue. You can simulate a country with `curl -H "x-vercel-ip-country: IN"`.

**Caching per country, done cheaply.** Reading headers or cookies makes the page render per request. That sounds expensive, but TMDB returns *every* country's providers in one response, which is cached once for everyone. Only the cheap "pick one country out of the JSON" step differs per visitor. The alternative, caching a whole rendered page per country, would multiply cache entries by 100+.
> 🛠 **DevOps lesson:** every value that changes a response is part of its cache key. Keep the expensive, shared part cacheable and do the per-user part last.

**`append_to_response`.** The detail request now asks TMDB for `videos,watch/providers` in the same call. That's one round trip and one cache entry instead of three.

**Server Functions are public endpoints.** `setCountry()` in `app/actions/country.ts` runs on the server, but anyone can call it with any argument. So it validates the country code like any request body.

**Third-party scripts cost performance.** A YouTube embed loads about 1 MB of JavaScript. The iframe only exists while the trailer dialog is open, so visitors who never press play never download it. `youtube-nocookie.com` avoids tracking cookies until playback.

**Third-party links are untrusted input.** AniList's streaming links are only rendered if they start with `http(s)://`. A `javascript:` URL from any upstream API would otherwise become a script injection.

**Licensing is part of the job.** TMDB's provider data comes from JustWatch, and attribution is required, hence the "Availability data from JustWatch" line.

### How it was verified
```bash
curl localhost:3110/media/movie/693134 | grep -o 'alt="HBO Max"'                              # US default
curl -H "x-vercel-ip-country: IN" localhost:3110/media/movie/693134 | grep -o 'alt="Netflix"'  # India
curl -H "x-vercel-ip-country: IN" -H "Cookie: ntb-country=US" …                                # cookie wins
```
A headless-Chrome script (Puppeteer) clicked through these flows:
- saving as a guest, then saving the same title again;
- a tampered `localStorage` entry being dropped;
- removing an item;
- opening the trailer (no iframe before the click);
- picking a country (the server action sets the cookie and the page re-renders).

**Not yet verified:** the import after sign-in. It needs migration `0002` applied and a real sign-up. Test it on a preview deployment.

### After you deploy: checklist
1. Run `lib/db/migrations/0002_unique_watchlist_items.sql` in the Supabase SQL editor.
2. As a signed-out visitor, save 2–3 titles, then sign up. You should get a toast like "Moved 3 saved titles into My watchlist".
3. On the deployed site, check that "Where to watch" shows your own country without you picking it.

### Possible follow-ups
- "Only show what's on my services": save the user's streaming services and filter the browse grids with TMDB's `with_watch_providers` and `watch_region`.
- Add a Content Security Policy header (`frame-src https://www.youtube-nocookie.com`) once the app's third-party origins are mapped. Clerk needs its own entries.

---

## Phase 4: Engagement ✅

**Goal:** give visitors reasons to keep clicking once they arrive, and give Google more pages worth ranking.

### What was built, and why

| Piece | Files | What it does |
|---|---|---|
| "Because you saved…" | `app/api/recommendations/route.ts`, `components/recommendations.tsx` | Up to 3 home-page rows seeded from your 3 most recently saved titles |
| Mood picker | `app/(main)/tonight/page.tsx`, `lib/tonight.ts` | `/tonight`: pick a mood, type and time; get 3 picks and a Shuffle button |
| Browse filters | `lib/browse-filters.ts`, `components/browse-filters.tsx` | Sort, genre, year and rating (format for anime) on every browse grid |
| Collections | `lib/collections.ts`, `app/(main)/collections/` | 10 curated, indexable lists such as "Best anime under 13 episodes" and "Top K-dramas" |

### Concepts worth understanding

**Personalized content vs the CDN.** The home page is the same for everyone, so it's rendered once and served from the CDN (the build output still shows `/` as `○ Static`). Recommendations are different for every user, and rendering them into the page would cause one of two problems:
- the page would have to be rendered per request, for every visitor;
- or, worse, a cached copy showing *one user's* taste would be served to the next visitor.

So the browser fetches them separately from `/api/recommendations`. That endpoint answers with `Cache-Control: private, max-age=60`: the browser may reuse the response for a minute, and shared caches must never store it.
> 🛠 **DevOps lesson:** know which parts of a response are shared and which are personal, and never let a CDN cache the personal part. Mis-set cache headers on personalized responses are a classic cause of data leaks.

**Fan-out.** One recommendations request turns into 3 upstream requests (one per seed). They run in parallel with `Promise.allSettled`, so a slow or failing API costs one row, not the page. The upstream results aren't personal (recommendations *for Dune* are the same for everyone), so they sit in the shared data cache. Only the database query for "what did this user save" runs every time.

**State in the URL.** Mood, filters and shuffle are all URL parameters (`/tonight?mood=scary&type=tv&seed=3`), not React state. A refresh keeps them, a link shares them, and the server can render them. As a result the mood picker needs no client-side JavaScript of its own.

**Deterministic randomness.** "Shuffle" doesn't call `Math.random()`. It increments a `seed`, and a small seeded random-number generator (mulberry32) uses it to pick a page of results and shuffle it. That has two benefits:
- the same URL always shows the same three picks, so a shared link shows what you saw;
- upstream requests stay cacheable, because every visitor on seed 3 asks TMDB for the same page.

**Validate search params.** Everything in the URL is user input. Filters are checked against known option lists before they reach TMDB or AniList, and unknown values fall back to defaults. This also fixed an existing bug: `?page=abc` used to produce `Math.max(1, NaN)`, which is `NaN`, so TMDB was asked for page "NaN".

**Faceted navigation and crawl budget.** Every combination of genre × year × rating × sort is a separate URL, which adds up to tens of thousands of near-duplicate pages. Filtered grids are marked `noindex, follow`, so Google follows their links to title pages but doesn't index the grids themselves.

The curated **collections** are the filtered pages that *should* rank. Each one:
- targets a phrase people actually search for;
- has a canonical URL, `ItemList` structured data and a sitemap entry;
- links to every other collection.

**SSG + ISR for collections.** `generateStaticParams()` lists every collection slug, so all 10 pages are rendered to static HTML at build time (marked `●` in the build output). `dynamicParams = false` makes any other slug a 404 without rendering anything. The pages regenerate in the background at most once an hour, following the revalidate setting on their TMDB/AniList fetches.
> 🛠 **DevOps lesson:** choose the rendering mode per route.
> - Static for pages that are the same for everyone (collections, home).
> - Dynamic for pages that depend on the request (search, filtered browse, where-to-watch).
> - Client-side fetches for personal pieces inside static pages.

**Config over code.** A collection is a data entry (`slug`, `title`, discover parameters), not a new file. Adding one adds its page, sitemap entry and index card automatically. Each list was checked against the live API before it went in. The first version of "sci-fi" was full of animated films, and "comedy series" was full of kids' shows.

**Responsive layout is part of "done".** With six links, the desktop navbar no longer fit at tablet width: search got squeezed and "Sign up" was pushed off-screen. Tablets now get the scrolling link rail that phones use (`md` → `lg` breakpoint). Testing at 390, 800 and 1280px also turned up an older bug: detail-page titles were hidden behind the backdrop image, a CSS stacking issue fixed with `relative` on the hero content.

### How it was verified
```bash
curl "localhost:3110/tonight?mood=funny"         # the same 3 picks every time
curl "localhost:3110/tonight?mood=funny&seed=1"  # 3 different picks
curl "localhost:3110/browse/movies?genre=35" | grep robots       # noindex, follow
curl localhost:3110/collections/top-k-dramas | grep canonical
curl -o /dev/null -w "%{http_code}" localhost:3110/collections/nope      # 404
curl -o /dev/null -w "%{http_code}" localhost:3110/api/recommendations   # 401 when signed out
```

**Not yet verified:** recommendations with a real signed-in account. Save a few titles and reload the home page.

### Possible follow-ups
- Seasonal collections ("Anime airing this season") fed by AniList's `season` and `seasonYear`.
- Record which moods people pick most (Phase 0.3 analytics) and feature the top one on the home page.
- A share button on `/tonight`, since each result URL is already shareable.

---

## Phase 5: Retention

| Feature | What | You'll learn |
|---|---|---|
| **Episode progress** | Track "S2E5" per series; an "Up next" row on the home page | Schema design (progress table), optimistic UI |
| **Ratings and reviews** | Your own 1–10 score and a short note; later, community averages | Aggregation queries, and ratings you're allowed to put in JSON-LD |
| **Seasonal anime calendar** | This week's airing episodes from AniList `airingSchedule` | Time zones, ISR schedules |
| **Imports** | MyAnimeList / AniList / Letterboxd / IMDb CSV import | File uploads, background jobs (Inngest or QStash), retries, progress reporting |
| **Installable app + notifications** | PWA manifest (`app/manifest.ts`), web push "new episode aired" alerts | Service workers, VAPID keys, **scheduled cron jobs** (Vercel Cron), fan-out to many users |
| **Year in review** | "You watched 142 hours in 2026", as a shareable image | Batch jobs, OG images again, loops back to Phase 2 |

The notifications feature is the most DevOps-heavy item on this roadmap. A cron job runs every hour, finds newly aired episodes, looks up the users tracking those shows, and sends push messages. It has to be idempotent, rate-limited and monitored. Build it after Phase 0's monitoring is in place.

---

## Phase 6: Community

- **What:** follow friends and see what they're adding and watching.
- **Why:** strong retention, but only once there are enough users. An empty feed hurts more than no feed.
- **You'll learn:** feed architecture (fan-out on write vs on read), database indexes, pagination at scale, moderation and privacy controls.

---

## Skills map: what each phase teaches

| Concept | Where you practise it |
|---|---|
| Env config per environment | Phase 1 (`SITE_URL`), 0.2 |
| CI/CD, secrets | 0.1, 0.2 |
| Caching layers, ISR, CDN | Phase 1, 2 (tag invalidation), 3.2, 4 (collections, private API responses) |
| Geo headers at the edge | 3.2 |
| Database migrations and constraints | 2 (additive column, deploy order), 3.1 (unique index), 5 |
| AuthN vs AuthZ | 2 (ownership in every WHERE, 404 not 403), 3.1 |
| Idempotency, concurrency (locks) | 3.1, 5 (imports, notifications) |
| Input validation (URL, body, localStorage) | 2 (SSRF), 3.1, 4 |
| Rendering modes: static, dynamic, client | 4 |
| Background jobs and cron | Phase 5 |
| Observability, alerting | 0.3, 0.4, Phase 5 |
| Third-party API limits | Every phase: TMDB, AniList |
