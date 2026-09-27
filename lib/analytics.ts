import { track as vercelTrack } from "@vercel/analytics";

// Product events: the steps of the growth funnel that page views can't show.
//
//   visit → Title saved (guest) → Guest list imported (= signed up with a list)
//   List made public → List shared → (someone visits) → List copied
//
// Every event goes through this one function. Swapping Vercel Analytics for
// PostHog or Plausible later means changing this file, not twenty call sites.
//
// Properties describe the action, never the person: no user ids, emails or
// titles. Vercel records custom events on the Pro plan; on Hobby, only page
// views are kept, and these calls are harmless.

type MediaType = "movie" | "tv" | "anime";

interface Events {
  "Title saved": { as: "guest" | "account"; type: MediaType };
  "Guest list imported": { count: number };
  "List made public": Record<string, never>;
  "List shared": { method: "share-sheet" | "clipboard"; owner: boolean };
  "List copied": Record<string, never>;
  "Trailer played": { type: MediaType };
}

export function track<E extends keyof Events>(event: E, properties: Events[E]) {
  // Analytics must never break the feature it measures.
  try {
    vercelTrack(event, properties);
  } catch {}
}
