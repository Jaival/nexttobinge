# NextToBinge — Design System

The spec the UI is built from. Change this file first, then the code.

Sources: Emil Kowalski's design-engineering rules (`emil-design-eng`), Apple's fluid-interface and HIG material (`apple-design`), the mobile platform-layer fixes (`mobile-native`), and the animation gate (`find-animation-opportunities`).

---

## 1. Principles

1. **Posters are the content.** Every surface is chrome around artwork. Chrome recedes: neutral backgrounds, one accent hue, no decorative borders competing with poster edges.
2. **Simplicity, not minimalism.** Strip what doesn't earn its place — but adding context can simplify. A rating badge that's always visible beats one hidden behind hover.
3. **Restraint in motion.** Most of this app is browsed dozens of times a day. High-frequency surfaces get near-imperceptible motion or none. The delight budget is spent on rare moments.
4. **Respond on press, not release.** Every tappable thing reacts the instant a finger lands.
5. **The phone is the target.** Sticky hover, tap-highlight flashes, input zoom and `100vh` are bugs, not cosmetics.

---

## 2. Colour

### Architecture

Two independent axes, each with its own persistence:

| Axis | Mechanism | Values | Storage key |
| --- | --- | --- | --- |
| Mode | `next-themes`, `attribute="class"` | `dark` (default), `light` | `theme` |
| Palette | `data-palette` on `<html>` | `violet` (default), `coral`, `mint` | `ntb-palette` |

Both are applied before first paint. `next-themes` ships its own blocking script; the palette gets a small inline script in `app/layout.tsx`.

Cascade order matters — every block defines the **complete** token set, ordered so the light+palette selector is the most specific:

```
:root                              /* violet dark  — base, no class required */
:root[data-palette="coral"]        /* coral  dark */
:root[data-palette="mint"]         /* mint   dark */
:root.light                        /* violet light */
:root.light[data-palette="coral"]  /* coral  light */
:root.light[data-palette="mint"]   /* mint   light */
```

Dark is the un-classed base so the app is never briefly white. `color-scheme` is set per block so native scrollbars and form controls follow.

### Semantic tokens

The standard shadcn set, plus two additions:

- `--brand` — the palette's secondary hue. Gradients, the home glow, accent strokes. Never text.
- `--rating` — gold. **Constant across all three palettes.** A star is gold everywhere; that is Familiarity, not a theme decision. Replaces the hardcoded `yellow-400` / `yellow-500`.

Removed as unused: all `--chart-*` and `--sidebar-*` tokens.

### Lightness ladder

Shared by all palettes; only hue and chroma change. This is what keeps the three themes feeling like one product.

| Token | Dark L | Light L |
| --- | --- | --- |
| `background` | 0.145–0.155 | 0.995 |
| `card` | 0.185–0.195 | 1.000 |
| `popover` | 0.205–0.215 | 1.000 |
| `secondary` | 0.235–0.245 | 0.965 |
| `muted` | 0.245–0.255 | 0.968 |
| `accent` | 0.265–0.278 | 0.958 |
| `muted-foreground` | 0.705–0.715 | 0.518–0.525 |
| `foreground` | 0.970 | 0.168–0.175 |

### Primary contrast rule

Derived, not guessed. Converting OKLCH `L` to relative luminance, 4.5:1 against white needs `L ≤ 0.50`; against near-black it needs `L ≥ 0.63`.

- **Light mode:** primary `L 0.47–0.49`, high chroma, near-white foreground.
- **Dark mode:** primary `L 0.75–0.79`, medium chroma, near-black tinted foreground.

Bright-primary-with-dark-text in dark mode is deliberate — it is what makes the accent read as lit rather than muddy.

### The three palettes

| | Violet (default) | Coral | Mint |
| --- | --- | --- | --- |
| Neutral hue | 288 | 62 (warm grey) | 200 (cool ink) |
| Primary hue | 292 | 34 | 172 |
| `--brand` | 330 fuchsia | 158 sage | 300 orchid |
| Destructive hue | 22 / 27 | **15** | 22 / 27 |
| Feel | Premium streaming | Editorial, warm | Crisp, technical |

Coral's destructive is pushed to hue 15 (deep crimson) because a hue-34 primary next to a hue-22 red would be confusable. The two also differ in treatment — primary is a solid fill, destructive is `bg-destructive/10 text-destructive`.

Exact `oklch()` values live in `app/globals.css`; that file is the source of truth for numbers.

---

## 3. Typography

One family. Two typefaces in a media browser is noise.

| Role | Family | Size | Weight | Tracking | Leading |
| --- | --- | --- | --- | --- | --- |
| Display (home h1) | Geist Sans | `clamp(2rem, 6vw, 3.25rem)` | 600 | `-0.035em` | 1.02 |
| Page title | Geist Sans | `1.75rem` | 600 | `-0.025em` | 1.15 |
| Section heading | Geist Sans | `1.125rem` | 600 | `-0.015em` | 1.3 |
| Body | Geist Sans | `0.875–1rem` | 400 | `0` | 1.55 |
| Caption / meta | Geist Mono | `0.75rem` | 500 | `0.01em` | 1.4 |

**Tracking is size-specific, never one global value** (Apple, *The Details of UI Typography*): large text reads too loose at default tracking, small text too tight.

Years, ratings, runtimes and counts are set in **Geist Mono**. Numeric metadata in mono is the cheapest single move that makes an interface look designed rather than assembled.

Dropped: `Manrope`, `Roboto_Slab`. `--font-heading` stays defined (existing `font-heading` classes keep working) and resolves to Geist.

---

## 4. Shape, depth, material

- `--radius: 0.7rem` (was `0.45rem`). Posters `rounded-xl`, cards `rounded-2xl`, controls `rounded-md`.
- **Depth via `ring-1` + a soft shadow, not hard 1px borders.** Borders cut; rings sit.
- **The navbar is a translucent layer**, not an opaque strip: `backdrop-blur-xl saturate-150` over `bg-background/70`, with content scrolling underneath.
- **Scroll-edge, not a permanent divider.** The header's border and shadow fade in only once content is under it (`data-scrolled`), per Apple's scroll edge effect.
- Never stack a translucent surface on another translucent surface.
- Honour `prefers-reduced-transparency: reduce` — raise background opacity to 1, drop the blur.

---

## 5. Motion

### Tokens

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* enter, exit, press */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* sheets */
--dur-press: 140ms;
--dur-fast:  180ms;
--dur-base:  220ms;
--dur-slow:  320ms;
```

Built-in CSS easings are too weak. **Never `ease-in` on UI** — it delays the first frame, exactly when the user is watching. **Never `transition: all`.** Animate `transform` and `opacity` only.

### What animates — every row passed the four-question gate

| # | Location | Today | Purpose | Frequency | Motion |
| --- | --- | --- | --- | --- | --- |
| 1 | `media-card.tsx` poster | Hover-only rating and add button; ungated hover | Feedback | Tens/day | Rating chip **always visible**. Hover lift `scale(1.03)`, `transform var(--dur-base) var(--ease-out)`, gated `@media (hover:hover) and (pointer:fine)`. `:active { scale(0.985) }` at `--dur-press` so touch gets feedback too. |
| 2 | `media-card.tsx` poster image | Images pop in as they decode | Preventing a jarring change | Constant | `opacity 0 → 1` plus `scale(1.02) → 1` on `load`, `--dur-base var(--ease-out)`. Bridges a real visual discontinuity. |
| 3 | Navbar | Hard 1px border always present | State indication (am I at the top?) | Passive | `data-scrolled` fades border and shadow in over `--dur-base`. Non-blocking, no layout effect. |
| 4 | Watchlist item removal | Row vanishes instantly | Preventing a jarring change | Occasional | `data-removing`: `opacity 0`, `translateX(-8px)`, then row collapse. CSS **transition**, not keyframes, so rapid deletes retarget instead of restarting. |
| 5 | Destructive confirm | native `window.confirm()` | Feedback and safety | Occasional | Replaced with a real dialog. Overlay fades, panel `scale(0.97) → 1`, centred (modals keep `transform-origin: center`). |
| 6 | Empty states | Flat | Delight | **Rare** | `@starting-style` fade-up, `opacity 0` / `translateY(6px)`, `--dur-slow`. The delight budget lives here. |
| 7 | Mode / palette switch | n/a | Preventing a jarring change | Rare | 220ms crossfade on `background-color` and `color` only, scoped and time-boxed. Apple: never jump brightness abruptly. |

### What deliberately does not animate

- **Poster grid stagger.** Rejected: browse and search are core navigation seen tens of times a day, and a 20-item stagger has an 800ms tail. The grid is data being scanned; motion hinders.
- **Navbar active-link indicator slide.** Rejected: core navigation, 100+/day tier. It gets a 150ms colour transition and no movement.
- **Search tab switching.** Rejected: same tier. Content swaps instantly.
- **Page / route transitions.** Rejected: every navigation pays the cost and nothing is explained by it.
- **Toast motion.** Rejected as out of scope — Sonner owns it and its defaults are already right.
- **Button press scale.** Rejected in favour of the existing `translate-y-px`, which is already near-imperceptible and correct for the frequency tier. Only its `transition: all` is fixed.

### Accessibility

`prefers-reduced-motion: reduce` means **gentler, not zero**. Keep opacity and colour transitions that aid comprehension; drop transforms, lifts and translate-based exits.

---

## 6. Mobile platform layer

The floor, all of it currently missing:

| Fix | Why |
| --- | --- |
| `viewport-fit=cover, interactive-widget=resizes-content` | Without it `env(safe-area-inset-*)` is `0px`, and Android's keyboard does not resize the layout |
| `theme-color` per colour scheme, updated on toggle | One value gives light mode a black status bar |
| `-webkit-tap-highlight-color: transparent` | The grey flash is the loudest "this is a website" tell |
| `-webkit-text-size-adjust: 100%` | No font inflation in landscape |
| `overscroll-behavior: none` on `html, body` | Pull-to-refresh currently hijacks scroll |
| **Inputs `16px` on `(pointer: coarse)`** | `Input` is `text-sm` = 14px, so iOS zooms in on focus and never zooms back out. Real bug. |
| `touch-action: manipulation` on controls | Removes the residual tap delay |
| `user-select: none` on controls only — never `body` | Long-press currently selects button labels; body text must stay copyable |
| `env(safe-area-inset-top/bottom)` on the sticky header and mobile nav row | Content currently runs under the notch |
| `100dvh` / `100svh` instead of `100vh` | The auth page's `min-h-screen` overflows by the URL-bar height |
| `overscroll-behavior-x: contain` on the cast rail | Stops horizontal scroll chaining to page back-navigation |

Zoom is never disabled. `maximum-scale=1` is an accessibility failure; the 16px rule fixes the cause instead.

Poster-card hover styles are written as explicit `@media (hover: hover) and (pointer: fine)` CSS rather than relying on Tailwind's `group-hover:` variant, so the gating is verifiable by reading the file.

---

## 7. Layout

- Container `max-w-7xl`, `px-4 sm:px-6 lg:px-8`.
- Vertical rhythm on a 4px base. Section gap `3rem`, in-section gap `1rem`.
- Grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`, `gap-x-4 gap-y-6` — captions need more room below than posters need beside.
- Home hero: display line, one sentence, three category chips, and a single soft radial glow in `--brand`. One focal moment, then straight into content.

---

## 8. Component changes

| File | Change |
| --- | --- |
| `app/globals.css` | Rewritten: 6 palette blocks, motion and type tokens, mobile baseline, card/rail utilities |
| `app/layout.tsx` | Geist only; `viewport` export; palette FOUC script; `ThemeProvider` |
| `components/theme-provider.tsx` | **New.** `next-themes` plus palette context and `theme-color` sync |
| `components/theme-controls.tsx` | **New.** Mode toggle and palette picker |
| `components/confirm-dialog.tsx` | **New.** Replaces both `window.confirm()` calls |
| `components/navbar.tsx` | Translucent layer, scroll edge, safe areas, theme controls, rounded search, logo, Log in / Sign up |
| `components/media-card.tsx` | Always-visible rating, image fade-in, press feedback, optional type badge, mono meta |
| `components/media-grid.tsx` | 6 columns at xl, asymmetric gaps, matching skeletons |
| `components/ui/input.tsx` | 16px on coarse pointers |
| `components/ui/button.tsx` | `transition: all` replaced with explicit properties; `touch-action`, `user-select` |
| `app/(main)/page.tsx` | Hero and restyled section headers |
| `app/(main)/media/*/[id]/page.tsx` | Full-bleed backdrop, overlapping poster, mono meta row, snapping cast rail |
| `app/(main)/watchlists/*` | Poster-preview cards, confirm dialog, animated removal |
| `app/(auth)/*` | `dvh` and safe-area padding |

### Clerk

Clerk v7 exposes a CSS variable for every `appearance.variables` entry
(`--clerk-color-primary`, `--clerk-border-radius`, …), so its prebuilt components
are bound in `globals.css` rather than through a JS `appearance` prop:

```css
:root { --clerk-color-primary: var(--primary); /* …18 lines */ }
```

`var()` resolves against the final cascaded value of each token on `:root`, so when a
palette block redefines `--primary` the Clerk mapping follows. One mapping covers all
six palette/mode combinations — no colour table to keep in sync, and no new dependency.

Two constraints this has to respect:

- **No structural selectors.** Clerk warns at runtime that targeting its internal DOM
  (`.cl-rootBox input`) breaks on component updates. Only the documented `--clerk-*`
  variables are used.
- **Clerk's base font size is 13px**, and its inputs render at exactly that, so they hit
  the same iOS focus-zoom bug as our own. Fixed by raising `--clerk-font-size` to `1rem`
  on `(pointer: coarse)` — verified to take inputs to exactly 16px.

The theme toggle's `aria-label` is static. `resolvedTheme` is undefined during SSR, so a
label derived from it hydrates mismatched; the icon carries the state instead.

Type badges appear only on mixed grids (search, the "All" tab). On a "Trending Anime" row, an "Anime" badge on all ten cards is noise.

### Brand mark

`components/logo.tsx`. A "play next" glyph (a play triangle for *binge*, a bar for
*next*) on a squircle tile (`rounded-[30%]`) filled `--primary → --brand`. The glyph
is `--primary-foreground`, which already clears 4.5:1 against `--primary` in every
palette, and `--brand` sits at the same lightness, so the mark needs no per-palette
artwork. The wordmark sets "to" in `--muted-foreground` at medium weight so
*NextToBinge* reads as three words without extra spacing or capitals.

`app/icon.svg` is the same drawing with the default violet values baked in (a favicon
can't read CSS variables). It replaces the create-next-app `favicon.ico`.

### Auth and public routes

- Everything a visitor can look at is public: `/`, `/browse/*`, `/media/*`, `/search`.
  Only `/watchlists` and `/api/watchlists` need an account. Detail pages are public
  too, because a public grid whose cards lead to a sign-in wall is a dead end.
- The navbar shows **Log in** (ghost) and **Sign up** (primary pill) through Clerk's
  `<Show when="signed-out">`. `SignedIn`/`SignedOut` were removed in Clerk v7. Both
  open as **modals**, so signing in keeps the page you were on. Below `sm`, only Log in
  shows (its modal links to sign-up), so the search field keeps usable width at 375px.
- A signed-out **+ Add** opens the sign-in modal (`useRequireSignIn`), not a watchlist
  dialog whose requests would all 404 behind the auth proxy (`proxy.ts`).
- `signInUrl`/`signUpUrl` are set on both `ClerkProvider` and `clerkMiddleware`.
  Without them Clerk sends users to its hosted Account Portal, not the themed pages.
- "Dramas" is now **Series**. It's one word like Movies and Anime, it fits the mobile
  rail, and it works as a card badge. Only labels and the `/browse/series` path
  changed. The DB `media_type` value stays `tv`, and `/browse/dramas` 308-redirects.

---

## 9. Verification

Verifiable from code: token contrast maths, hover gating, `transition` property lists, reduced motion, safe-area declarations, input font size, build and lint.

**Requires real hardware** (emulation reproduces none of these): sticky hover after tap, the tap highlight, the URL bar's effect on `dvh`, input zoom on focus, tap latency, overscroll, notch insets, and status-bar colour.
