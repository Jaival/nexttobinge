// Rules the browser's guest list (lib/guest-watchlist.ts) and the server's
// import endpoint (app/api/watchlists/import) must agree on. Kept apart from
// the guest list itself, which imports a React hook the server can't load.

/** Past this, signing up is the answer. The import endpoint enforces it too. */
export const GUEST_LIMIT = 50;

// The image hosts next.config.ts allows. next/image throws on any other host,
// so an edited poster URL would break the page that renders it.
const POSTER_HOSTS = ["image.tmdb.org", "s4.anilist.co", "media.kitsu.app"];

export function isPosterUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && POSTER_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
