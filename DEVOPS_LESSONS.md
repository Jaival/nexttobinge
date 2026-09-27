# DevOps lessons from building NextToBinge

Every lesson below came up while building a real feature in this repo. Each one gives:
- **the rule**, the general principle you can reuse anywhere;
- **what happened here**, the concrete case, often a bug that was caught or a test that proved the point;
- **where to look**, the files that show it in code.

[ROADMAP.md](ROADMAP.md) tells the same story phase by phase. This file is organized by topic, for revising and for interviews. A self-test is at the end.

**Contents**
1. [Configuration and environments](#1-configuration-and-environments)
2. [CI/CD pipelines](#2-cicd-pipelines)
3. [Databases and migrations](#3-databases-and-migrations)
4. [Idempotency and concurrency](#4-idempotency-and-concurrency)
5. [Caching](#5-caching)
6. [Rendering modes](#6-rendering-modes)
7. [Security](#7-security)
8. [Living with third-party APIs](#8-living-with-third-party-apis)
9. [Observability](#9-observability)
10. [Privacy, licensing and compliance](#10-privacy-licensing-and-compliance)
11. [Verification habits](#11-verification-habits)
12. [Test yourself](#12-test-yourself)

---

## 1. Configuration and environments

### 1.1 Config comes from the environment, not the code
**Rule:** the same build artifact should behave correctly in every environment, with the differences supplied by environment variables. This is factor III of the [twelve-factor app](https://12factor.net/config).

**Here:** canonical URLs, the sitemap and link-preview images need the site's absolute origin. `SITE_URL` provides it, falling back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then `localhost`. If production ever shows `localhost` in its sitemap, a variable is missing, and nothing in the code needs changing.

**Where:** `lib/seo.ts`, `env.ts`.

### 1.2 Validate configuration at startup and fail fast
**Rule:** a missing or malformed variable should stop the app from starting with a clear message, not cause a confusing error on some request hours later.

**Here:** `env.ts` validates every variable with zod when the app loads. Two escape hatches exist for specific reasons:
- `SKIP_ENV_VALIDATION`: CI's lint and type-check job loads `next.config.ts` without running the app, so it has nothing to validate against.
- `emptyStringAsUndefined`: an optional variable left blank in a dashboard counts as unset instead of failing validation.

**Where:** `env.ts`.

### 1.3 Document every variable, commit none of the values
**Rule:** a new developer (or a CI job) should be able to see every variable the app needs without seeing any secret.

**Here:** the README told people to copy `.env.local.example`, but that file never existed: the `.gitignore` rule `.env*` had always hidden it. `.env.example` is now committed through a `!.env.example` exception. It holds names and comments only.

**Where:** `.env.example`, `.gitignore`.

### 1.4 Environments are only isolated if their data and credentials are
**Rule:** Development, Preview and Production need separate databases and auth instances, not just separate URLs.

**Here:** by default a Vercel preview deployment uses the production `DATABASE_URL`. Anyone testing a PR could edit real users' watchlists, and a PR with a new migration could break production before it's merged. The fix is dashboard configuration: give the Preview environment its own database and Clerk development keys.

**Where:** ROADMAP.md, Phase 0.2 and the setup checklist.

### 1.5 Behavior can depend on the environment, when it should
**Rule:** some behavior legitimately differs per environment. Key it on the platform's environment variable.

**Here:** a preview deployment is a full copy of the site at another URL. If Google indexed it, it would compete with production as duplicate content. `robots.ts` returns `Disallow: /` when `VERCEL_ENV` is `preview`. `robots.txt` is generated at build time, so this was tested with a preview build.

**Where:** `app/robots.ts`.

---

## 2. CI/CD pipelines

### 2.1 Split jobs by what they need
**Rule:** cheap, fast checks first; expensive ones only after they pass. Each job gets only the access it needs.

**Here:**
- `checks` (lint + type-check) needs no secrets and runs in about a minute.
- `build` needs the TMDB key and only starts after `checks` passes (`needs: checks`). A lint error never costs a two-minute build.

**Where:** `.github/workflows/ci.yml`.

### 2.2 Type-checking is not building
**Rule:** CI must run the real production build, because some errors only appear when bundling.

**Here:** an import route imported a constant from `lib/guest-watchlist.ts`, which also imports a React hook. `tsc` was happy, but `next build` failed, because server code can't load client-only modules. The fix was moving the shared constants into their own module with no React in it.

**Where:** `lib/guest-watchlist-rules.ts`.

### 2.3 Secrets vs variables, and least privilege
**Rule:** a secret is something that grants access. Store it encrypted and give it to as few jobs as possible. Public values aren't secrets, and placeholders are better than real credentials that are never used.

**Here:**

| Value | Stored as | Why |
|---|---|---|
| `TMDB_API_KEY` | Secret | Grants API access; the build prerenders pages from TMDB |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Variable | Ships to every browser anyway |
| `DATABASE_URL`, `CLERK_SECRET_KEY` | Placeholders in the workflow | The build only validates them and never connects. CI holds no credential that could reach user data |
| GitHub token | `permissions: contents: read` | The job can read code, not push or edit issues |

**Where:** `.github/workflows/ci.yml`.

### 2.4 Pull requests from forks don't get secrets
**Rule:** on a public repo, GitHub withholds secrets from workflows triggered by fork PRs; otherwise anyone could open a PR that prints them. Design for it.

**Here:** the `checks` job has no secrets, so it runs for everyone. The `build` job is skipped for fork PRs instead of failing with an error unrelated to the change.

**Where:** the `if:` on the `build` job in `ci.yml`.

### 2.5 Reproducible installs
**Rule:** CI should install exactly what the lockfile says, or fail.

**Here:** `bun install --frozen-lockfile` fails if `package.json` and `bun.lock` disagree, instead of quietly installing versions you never tested. Bun itself is pinned to the local version.

### 2.6 Cache by content hash
**Rule:** a cache key should change exactly when the cached thing would change.

**Here:**
- Downloaded packages are cached under the hash of `bun.lock`: same lockfile, same cache.
- Next.js's build cache uses `restore-keys` to fall back to the closest older entry, so small changes rebuild quickly.

### 2.7 Don't waste runs, and verify versions
**Rule:** cancel CI runs whose results nobody needs, and look up tool versions instead of copying them from memory or old tutorials.

**Here:**
- `concurrency: cancel-in-progress` stops the run for an old commit when a new one is pushed.
- The action versions were checked with `gh api` before writing the workflow: `checkout` is at v7 and `cache` at v6, not the v4 most tutorials show.

### 2.8 Keep dependencies moving, without the noise
**Rule:** outdated dependencies turn into security debt. Automate updates, but group them so they don't become noise you learn to ignore.

**Here:**
- Dependabot opens one grouped PR per week for minor and patch updates, and separate PRs for major versions (the ones worth reading).
- GitHub Actions are updated monthly too: they're code that runs with access to your secrets.

**Where:** `.github/dependabot.yml`.

### 2.9 A check is advice until branch protection makes it a rule
**Rule:** CI only prevents bad merges if the repo *requires* it to pass.

**Here:** GitHub → Settings → Branches → protect `main` and require `Lint and typecheck` and `Build`. This is a repo setting, not a file.

### 2.10 Rehearse CI locally
**Rule:** don't debug a pipeline by pushing commits and waiting.

**Here:**
1. A clean copy of the repo was made with `git ls-files -co --exclude-standard | tar …`: exactly what a fresh checkout contains, with no `.env`, `node_modules` or `.next`.
2. Both jobs ran there with the workflow's own environment variables.
3. The build passed with only the TMDB key real, which proved the least-privilege design before GitHub ever ran it.

---

## 3. Databases and migrations

### 3.1 Additive changes: migrate first, then deploy
**Rule:** when you *add* a column or table, run the migration before deploying code that uses it. When you *remove* one, deploy code that stops using it first, then migrate. This is the *expand/contract* pattern.

**Here:** migration `0003` adds `watchlists.is_public`. Drizzle names every column in its `SELECT`s, so the new code fails on a database that doesn't have the column yet. The deploy checklist says to run the migration **before** deploying.

**Where:** `lib/db/migrations/0003_public_watchlists.sql`.

### 3.2 Better still: code that works before *and* after the migration
**Rule:** if the code tolerates both schemas, deploy order stops mattering.

**Here:** the guest-list import filters duplicates in code *and* relies on the unique index from `0002`. It's correct on a database where `0002` hasn't run yet.

**Where:** `app/api/watchlists/import/route.ts`.

### 3.3 Clean up before you constrain
**Rule:** a constraint can't be added while existing data violates it. The migration must fix the data first, keeping the row that matters.

**Here:** `0002` deletes duplicate watchlist items, keeping the **oldest** (it holds the user's watch status), then creates the unique index.

**Where:** `lib/db/migrations/0002_unique_watchlist_items.sql`.

### 3.4 Safe to run twice, cheap on a live table
**Rule:** migrations should be re-runnable, and shouldn't lock or rewrite big tables.

**Here:** `ADD COLUMN IF NOT EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`. Since Postgres 11, adding a column with a constant default doesn't rewrite the table.

### 3.5 Test migrations like code, on a throwaway database
**Rule:** never let the production database be the first place a migration runs.

**Here:** all four migrations ran against a local PGlite (Postgres compiled to WASM), with a duplicate row planted on purpose. The results:
- `0002` kept the oldest row, with its "watched" status.
- Re-running `0003` was harmless.
- The index rejected a new duplicate with error `23505`.

All of this happened before anything touched Supabase.

---

## 4. Idempotency and concurrency

### 4.1 Anything that can be retried must be idempotent
**Rule:** running an operation twice must have the same effect as running it once. This applies to webhooks, queue jobs, cron jobs, imports, and any request a browser might retry.

**Here:** the guest-list import can run twice: a retry after a timeout, or two open tabs. Three layers make that harmless:
1. **The client** clears the guest list only after the server confirms, and only the items it sent.
2. **An advisory lock** (`pg_advisory_xact_lock`) makes two imports for the same user take turns, so they can't both create "My watchlist".
3. **The unique index** plus `ON CONFLICT DO NOTHING` turns a duplicate insert into a no-op.

**Where:** `components/guest-watchlist-sync.tsx`, `app/api/watchlists/import/route.ts`.

### 4.2 "Check, then insert" is a race condition
**Rule:** two requests can both pass an "does it exist?" check before either inserts. Only a database constraint closes that race.

**Here:** the add-item API has always checked for duplicates in code. The unique index from `0002` is what actually guarantees it.

### 4.3 Know where you're *not* idempotent
**Rule:** when you accept a non-idempotent operation, mitigate it and write it down.

**Here:** "Save a copy" creates a new list each time. The button is disabled while the request runs, and an idempotency key is listed as a follow-up in ROADMAP.md.

---

## 5. Caching

### 5.1 Caches come in layers
**Rule:** know every layer between the user and the data, and what each one keys on.

**Here:**
1. **Data cache:** `fetch(…, { next: { revalidate: 3600 } })` keeps TMDB responses for an hour.
2. **Request memoization:** identical GET `fetch` calls within one render run only once.
3. **React `cache()`:** added by hand for AniList, whose GraphQL requests are POSTs that Next.js doesn't memoize.
4. **`unstable_cache` with tags:** caches database reads for public lists.
5. **The CDN / full-route cache:** static and ISR pages.
6. **Other people's caches:** the browser (`Cache-Control`) and link-preview bots.

### 5.2 Every input that changes the response is part of the cache key
**Rule:** if two users can get different responses from the same URL, the cache must know why, or it will serve one user's response to the other.

**Here:** "Where to watch" depends on the visitor's country. Caching a rendered page per country would multiply cache entries by 100+. Instead, TMDB returns every country's providers in one response, which is cached once for everyone. Only the cheap "pick one country from the JSON" step runs per request.

**Where:** `components/where-to-watch.tsx`, `lib/country.ts`.

### 5.3 Never let a shared cache store personal data
**Rule:** personalized responses must be `Cache-Control: private`. A CDN caching one user's page and serving it to others is a classic data leak.

**Here:** the home page is the same for everyone, so it's static. "Because you saved…" recommendations are fetched separately by the browser from an endpoint marked `private, max-age=60`.

**Where:** `app/api/recommendations/route.ts`, `components/recommendations.tsx`.

### 5.4 A cache is a copy that ignores your permissions
**Rule:** when access is revoked, every cached copy must go, *immediately*.

**Here:** two invalidation modes, on purpose:
- **Content edits** (rename, item added): `revalidateTag(tag, "max")`, stale-while-revalidate. One visitor may see a copy that's a few seconds old.
- **Visibility changes** (made private or public, deleted): `revalidateTag(tag, { expire: 0 })`, so the old copy is never served again.

The test proved why. With a list flipped to private directly in the database, where no invalidation ran, the cached page kept being served (`200 HIT`) until the tag was expired. Then it returned `404`.

**Where:** `lib/public-lists.ts`.

### 5.5 Time-based expiry is a safety net, not the plan
**Rule:** invalidate on write, and keep a TTL for the changes your code never sees.

**Here:** public lists are invalidated by every API write. The one-hour `revalidate` catches changes made elsewhere, such as an owner renaming themselves in Clerk.

### 5.6 You can't purge other people's caches
**Rule:** once a response leaves your infrastructure, you don't control its lifetime.

**Here:** Discord and WhatsApp cache link-preview images. A renamed list may show its old card in a chat for a while, whatever your server does.

### 5.7 New features change your load on upstream APIs
**Rule:** every feature that calls an external API changes your request rate. Know their rate limits and your cache hit rate.

**Here:** adding page metadata would have doubled requests to AniList (rate-limited at about 90 per minute) if `getAnimeDetails` hadn't been wrapped in `cache()`. Detail pages also ask TMDB for videos and providers with `append_to_response`: one request instead of three.

---

## 6. Rendering modes

### 6.1 Choose the rendering mode per route
**Rule:** static for what's the same for everyone, dynamic for what depends on the request, client-side for what's personal inside an otherwise static page.

**Here:**

| Mode | Build symbol | Routes |
|---|---|---|
| Static | `○` | Home page, `/collections`, `robots.txt` |
| SSG at build | `●` | 10 collection pages (`generateStaticParams`) |
| ISR on first visit | `●` | `/lists/[id]` and its preview image (`generateStaticParams() => []`) |
| Dynamic | `ƒ` | Search, filtered browse, detail pages (per-country providers), APIs |
| Client fetch | inside `○` | Recommendations on the home page |

### 6.2 Read the build output
**Rule:** the build tells you how every route will be served. Check it after changes; a route silently turning dynamic costs money and speed.

**Here:** the build output was checked after every phase, for example to confirm `/` stayed `○` after recommendations were added, and that `/lists/[id]` became `●`.

---

## 7. Security

### 7.1 Authentication vs authorization
**Rule:** authentication is *who you are*; authorization is *what you may do*. Most real bugs are in authorization.

**Here:** Clerk handles authentication. Authorization is in the queries:
- **Viewing** a shared list: `WHERE id = ? AND is_public = true`. A private list never even loads on the public path.
- **Every write:** `AND user_id = <you>`. Knowing a list's id isn't enough to change it.
- **Copying:** allowed if the list is public *or* yours.

**Where:** `lib/public-lists.ts`, `app/api/watchlists/[id]/route.ts`, `…/copy/route.ts`.

### 7.2 Answer 404, not 403, for things that shouldn't be known to exist
**Rule:** a 403 confirms the resource exists. For private resources, "not found" leaks nothing.

**Here:** private, missing and malformed list ids all return the same `404`.

### 7.3 Hiding a button is not security
**Rule:** the server must check permissions on every request. The client only asks.

**Here:** the share switch sends `isPublic`, and the server decides whether this user may change it (the ownership check in the `WHERE` clause).

### 7.4 Middleware decides who must sign in, not who may see what
**Rule:** every new public endpoint must be added to the auth middleware's allow-list, and tested as an anonymous client.

**Here:** Clerk's `proxy.ts` treats unlisted routes as private. The same trap came up four times:
- `robots.txt`, the sitemap and preview images: Googlebot would have been redirected to sign-in.
- `/lists/*`: shared links would have hit a sign-in wall.
- `/api/health`: uptime monitors have no session.
- `/monitoring`: Sentry's tunnel for browser errors; signed-out visitors' error reports would have been redirected.

**Where:** `proxy.ts`.

### 7.5 Validate every input, wherever it comes from
**Rule:** URL parameters, request bodies, `localStorage`, cookies and Server Action arguments are all user input.

**Here:**
- **API bodies** are validated with zod.
- **Search parameters** are checked against known option lists. This fixed a bug: `?page=abc` produced `NaN`, which was sent to TMDB.
- **Guest lists** from `localStorage` are validated twice, in the browser and again on the server.
- **`setCountry()`** is a Server Action, which is a public endpoint anyone can call, so it validates its argument.
- **Malformed UUIDs** become 404s instead of Postgres errors that surfaced as 500s (`isUuid`).
- **The add-item API** accepted any `mediaType`, and an invalid one crashed on the database enum.

### 7.6 Server-side fetches of user-supplied URLs: SSRF
**Rule:** if your server fetches a URL a user controls, an attacker can make it request internal addresses. That's **Server-Side Request Forgery**; the classic target is the cloud metadata service at `169.254.169.254`.

**Here:** the preview image for a shared list fetches poster URLs on the server. Two defences:
- the add-item API only accepts URLs from the known image hosts;
- older rows are filtered again when read.

The test planted a row with a metadata URL. It was never fetched and never appeared in the HTML.

**Where:** `lib/guest-watchlist-rules.ts` (`isPosterUrl`), `lib/public-lists.ts`.

### 7.7 Output encoding: XSS
**Rule:** data from anywhere, including trusted APIs, must be encoded for the context it lands in.

**Here:**
- **JSON-LD:** `<` is escaped as `<`, so a synopsis containing `</script>` can't break out of the tag (a stored XSS).
- **Third-party links:** AniList streaming links are only rendered if they start with `http(s)://`. A `javascript:` URL would run script.

**Where:** `components/json-ld.tsx`, `components/where-to-watch.tsx`.

---

## 8. Living with third-party APIs

### 8.1 Degrade gracefully
**Rule:** a failure in one dependency should cost one feature, not the page or the build.

**Here:**
- The sitemap and the recommendation rows use `Promise.allSettled`, and each collection preview catches its own failure. A TMDB outage returns less content instead of an error.
- A missing owner name on a shared list costs one line of text.

### 8.2 Every external call needs a timeout
**Rule:** a dependency that hangs is worse than one that fails, because it ties up your resources while you wait.

**Here:**
- Each poster in a preview image gets 3 seconds, and a slow one leaves an empty tile.
- The health check gives the database 3 seconds.

**Where:** `app/(main)/lists/[id]/opengraph-image.tsx`, `app/api/health/route.ts`.

### 8.3 Measure payloads against the consumer's limits
**Rule:** the right size is set by whoever consumes the output.

**Here:** the first preview image was a 524 KB PNG. WhatsApp tends to drop preview images much above 300 KB. Converting it to JPEG with `sharp` brought it to **54 KB**.

### 8.4 Third-party scripts are a performance cost
**Rule:** load third-party code only when the user asks for it.

**Here:** a YouTube embed loads about 1 MB of JavaScript. The iframe only exists while the trailer dialog is open, and it uses `youtube-nocookie.com`.

**Where:** `components/trailer-button.tsx`.

---

## 9. Observability

### 9.1 Health checks: check what you can act on
**Rule:** a health check answers "can this instance serve?" Check your own critical dependencies, not other companies' outages.

**Here:** `GET /api/health`:
- checks the database with a 3-second timeout, and returns 200 or 503;
- does *not* check TMDB or AniList: most pages still work without them, and you can't fix their outages;
- sends `Cache-Control: no-store` and no error details, because the endpoint is public;
- reports the deployed commit.

With the test database stopped, it answered 503 in 0.02 s.

### 9.2 Alerts you can't act on train you to ignore alerts
**Rule:** control noise before it controls you.

**Here:** Sentry ignores browser-extension errors and harmless `ResizeObserver` warnings, and traces only 10% of requests.

### 9.3 Capture errors where they happen
**Rule:** errors in visitors' browsers and in server rendering are invisible unless something reports them.

**Here:**
- **Server:** `onRequestError` (instrumentation.ts) catches errors from Server Components, route handlers, Server Actions and `proxy.ts`.
- **Browser:** `instrumentation-client.ts` catches client errors.
- **Environment:** every event is tagged `production` or `preview`.

Sentry is off until a DSN is set, so local dev, CI and forks send nothing.

### 9.4 Source maps: readable production stack traces
**Rule:** minified code gives useless stack traces. Upload source maps to your error tracker at build time, not to the public.

**Here:** with `SENTRY_AUTH_TOKEN` set, source maps are uploaded during the build and deleted from the deployed output (Sentry's default, checked in its type definitions). Without the token, the upload is skipped instead of failing the build.

### 9.5 Lab data vs field data
**Rule:** one Lighthouse run on your laptop is not what users experience.

**Here:** Speed Insights collects Core Web Vitals (LCP, INP, CLS) from real visitors' devices. That's the data Google ranks on.

### 9.6 Measure the funnel, behind one function
**Rule:** page views don't show whether a feature works. Track the steps of the funnel, through a single typed function.

**Here:** `track()` in `lib/analytics.ts` records the funnel steps: title saved as a guest → guest list imported, and list made public → shared → copied. Event names and properties are declared as types, so a typo is a compile error. Switching to PostHog later means editing one file.

---

## 10. Privacy, licensing and compliance

### 10.1 Monitoring and analytics are data flows to third parties
**Rule:** read what an SDK collects by default before you ship it.

**Here:** Sentry v11 collects cookies, headers, request bodies, database query values and local variables by default. For this app that includes Clerk session cookies and users' watchlists. `lib/sentry.ts` turns it all off except the user agent and referer. Analytics events carry actions (`as: "guest"`), never user ids or emails.

### 10.2 Publish only what users chose to publish
**Rule:** when data becomes public, publish the minimum, and say so before the user opts in.

**Here:** a shared list shows its titles and the owner's first name, never their watch status. The share dialog says this before the switch is turned on. Shared lists are `noindex`, so a list made private again doesn't linger in Google.

### 10.3 API terms are part of your production requirements
**Rule:** attribution and usage terms are conditions of keeping your API key.

**Here:** TMDB requires its logo and an exact notice, with its logo less prominent than yours. It's in the site footer. Provider data from JustWatch (via TMDB) is credited next to where-to-watch.

**Where:** `components/site-footer.tsx`, `components/where-to-watch.tsx`.

---

## 11. Verification habits

- **Test as an anonymous client.** `curl` with no cookies catches middleware mistakes your signed-in browser hides.
- **Test the failure path, not just the happy path.** Stop the database and watch the health check return 503. Flip a list to private and watch the cached copy survive until it's invalidated.
- **Use a throwaway database.** PGlite ran every migration and seeded the data for the tests, without touching Supabase.
- **Test responsive layouts at real widths.** Checking at 390px, 800px and 1280px caught the navbar overflowing at tablet width. It also caught detail-page titles hidden behind the backdrop, a CSS stacking bug.
- **Remove temporary test hooks, and grep to prove it.** A temporary route was added to trigger cache invalidation during testing, then deleted, with `grep` confirming no references remained.
- **Verify facts instead of remembering them.** Action versions came from `gh api`, Sentry's v11 API from its type definitions, and Next.js behavior from the docs shipped in `node_modules/next/dist/docs`.
- **Say what wasn't tested.** Every phase in ROADMAP.md ends with a "Not yet verified" line. An honest gap is better than false confidence.

---

## 12. Test yourself

Try to answer before opening the section in brackets.

1. Why does the CI `build` job use a fake `DATABASE_URL`, and why does that make CI *safer*? *(2.3)*
2. A fork opens a PR on this public repo. Which jobs run, and why? *(2.4)*
3. You're adding a `NOT NULL` column that the new code reads. Migrate first or deploy first? What about removing a column? *(3.1)*
4. Why isn't "check if it exists, then insert" enough to prevent duplicates? *(4.2)*
5. A list is made private. Why is `revalidateTag(tag, "max")` the wrong call here? *(5.4)*
6. Why are recommendations fetched by the browser instead of rendered into the home page? *(5.3, 6.1)*
7. Why does a private list return 404 rather than 403? *(7.2)*
8. What could an attacker do by saving `http://169.254.169.254/…` as a poster URL, and what stops it? *(7.6)*
9. Why doesn't the health check call TMDB? *(9.1)*
10. What would Sentry have sent to a third party with its default settings? *(10.1)*
11. A new endpoint works in your browser but returns a redirect to monitoring tools. What's the likely cause? *(7.4)*
12. The preview image works but WhatsApp shows no picture. What would you measure first? *(8.3)*
