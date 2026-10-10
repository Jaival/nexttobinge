# Launch checklist

Things only you can do: they need your accounts, dashboards, DNS, or a decision. The code is ready for them. Tick each box as you go.

Work top to bottom. Later sections assume the earlier ones are done.

Where a step has more detail elsewhere, the link points to it. [ROADMAP.md](ROADMAP.md) explains *why* each step exists.

---

## 1. Decisions and content

- [ ] **Read the terms** at `app/(main)/terms/page.tsx` and change anything you don't agree with. They are plain-language and not legal advice. Get them reviewed if you ever charge, run ads, or target one country's consumers.
- [ ] **Read the privacy policy** at `app/(main)/privacy/page.tsx` against what you've actually turned on (Sentry, Analytics). If you add a service, add it there too.
- [ ] **Set a private contact address.** `CONTACT_URL` in `lib/seo.ts` points to public GitHub issues, so privacy requests filed there are public. Use an email (`mailto:`) or a form.
- [ ] **Pick and buy the domain.** Many steps below need it.

## 2. Clerk: production instance

The app runs on a Clerk **development** instance (`*.clerk.accounts.dev`). Development instances are capped and show a "Development mode" badge, so real users need a production instance.

- [ ] In the Clerk dashboard, **create the production instance** for your domain.
- [ ] Add the **DNS records** Clerk lists (the `clerk.` and `accounts.` CNAMEs and the email records), then wait for them all to verify.
- [ ] **Google sign-in:** production instances need your own OAuth credentials. Create a Google Cloud OAuth client and paste the client ID and secret into Clerk → SSO connections → Google. Do the same for GitHub if you enable it.
- [ ] **Webhook:** Clerk → Webhooks → add the endpoint `https://<your-domain>/api/webhooks/clerk` with the events `user.created`, `user.updated` and `user.deleted`. Copy its signing secret.
- [ ] Copy the production **publishable key** and **secret key**. They go into Vercel in section 4.

> The Content Security Policy reads Clerk's host from the publishable key, so production keys allow `clerk.<your-domain>` automatically. No code change is needed.

## 3. Database (Supabase)

- [ ] Decide whether Production and Preview share a database. **Recommended: they don't.** A preview deployment that creates, edits or deletes test data should never touch real users' lists. Create a second Supabase project for Preview, or a branch.
- [ ] Use the **pooler** connection string (port 6543, transaction mode) for `DATABASE_URL`, not the direct one.
- [ ] Run the migrations against **each** database: `DATABASE_URL=<url> bun run db:migrate`.
  - The database was set up before the baseline migration existed? Follow "Already have a database?" in [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) first. The Phase 2 and 3 checklists in ROADMAP.md that mention `0002`/`0003` files are out of date; those files are now part of `0000_baseline.sql`.

## 4. Vercel

Project → Settings → Environment Variables. **Production** and **Preview** each get their own values.

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | production DB (pooler) | preview DB (pooler) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** key | Clerk **development** key |
| `CLERK_SECRET_KEY` | Clerk production | Clerk development |
| `CLERK_WEBHOOK_SECRET` | production webhook's secret | development webhook's secret |
| `TMDB_API_KEY` | ✓ | ✓ |
| `SITE_URL` | `https://<your-domain>` | leave unset |
| `GOOGLE_SITE_VERIFICATION` | only if you verify Search Console with the HTML tag | – |
| `NEXT_PUBLIC_SENTRY_DSN` | from section 6 | same |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | from section 6 | same |

- [ ] Set every variable above.
- [ ] **Domains:** add your domain and set the DNS records Vercel shows.
- [ ] **Analytics** and **Speed Insights:** turn both on (each is its own tab).
- [ ] **Node.js version** stays **24.x**. `@types/node` is pinned to 24 to match; if you change one, change the other.
- [ ] Redeploy Production so the new variables take effect.

## 5. GitHub

- [ ] Settings → Secrets and variables → Actions: add the **secret** `TMDB_API_KEY` and the **variable** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (the *development* key: CI only builds).
- [ ] Also add the same `TMDB_API_KEY` under **Dependabot** secrets. Dependabot PRs can't read Actions secrets, so without it their CI builds fail.
- [ ] Settings → Branches → protect `main`: require a PR, and require the `Lint and typecheck`, `Test` and `Build` checks.

## 6. Sentry

- [ ] Create a **Next.js** project. Copy the DSN into `NEXT_PUBLIC_SENTRY_DSN` (section 4).
- [ ] Create an **Organization Auth Token** (Settings → Auth Tokens) and set `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN`. Without them, stack traces stay minified.
- [ ] Alerts → create a rule: **"A new issue is created" → email me**.

## 7. Monitoring

- [ ] Point an uptime monitor (UptimeRobot, Better Stack, or similar) at `https://<your-domain>/api/health`. Alert on anything other than `200`.

---

## 8. After the production deploy: smoke test

Open the production site in a **private window** with the browser console open. Any `Content-Security-Policy` error in the console means something is blocked: add its origin in `next.config.ts`.

- [ ] Home, a browse page, a movie, a series and an anime page all load with posters.
- [ ] A trailer plays.
- [ ] "Where to watch" shows your own country without you picking it.
- [ ] `/this-does-not-exist` shows the 404 page, not a sign-in screen.
- [ ] **Guest mode:** signed out, save 2–3 titles, then sign up with **Google**. You should get a toast like "Moved 3 saved titles into My watchlist".
- [ ] In Supabase, your new user is in the `users` table. If not, the webhook isn't arriving: check Clerk → Webhooks → the endpoint's attempts.
- [ ] **Sharing:** open a list, press **Share**, switch on **Public link**, and open the link in another private window. Paste it into Discord or [opengraph.xyz](https://www.opengraph.xyz) and check the poster card. Switch it back off and reload: it should be a 404 straight away.
- [ ] **Account deletion:** with a throwaway account that has a shared list, delete the account (account menu → Manage account → Delete account). Its rows should disappear from `users` and `watchlists`, and the shared link should 404.
- [ ] **Sentry:** in Sentry → Issues, check that errors arrive within a day of real traffic. Browser errors reach Sentry through `/monitoring` on your own domain, so an ad blocker doesn't stop them.

## 9. Search

- [ ] Open `https://<your-domain>/robots.txt` and `/sitemap.xml`: the URLs must show your domain, not `localhost` or `*.vercel.app`. If they don't, `SITE_URL` isn't set for Production.
- [ ] [Google Search Console](https://search.google.com/search-console): add a **Domain** property, verify it with the DNS TXT record, and submit `/sitemap.xml`.
- [ ] Paste a movie URL into the [Rich Results Test](https://search.google.com/test/rich-results) to check the structured data.
- [ ] In 2–4 weeks, note the impressions and clicks in Search Console → Performance. That's your baseline.

## 10. Ongoing

- [ ] Each week, merge or close Dependabot's PRs. Minor and patch updates arrive grouped in one PR; read the changelog of anything that's a major version.
- [ ] When you add a third-party service, add its origins to the CSP in `next.config.ts` and mention it on the privacy page.
