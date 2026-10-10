import type { getTVDetails } from "@/lib/tmdb";
import type { getAnimeDetails } from "@/lib/anilist";

export interface EpisodeRef {
  season: number;
  episode: number;
}

/**
 * What a show has, reduced to what progress tracking needs. Built on the
 * server from TMDB or AniList and passed to the browser as plain data.
 */
export interface EpisodeGuide {
  /** In order. Episode counts may include announced episodes that haven't aired. */
  seasons: { number: number; episodes: number | null }[];
  /** The newest episode that has aired. Null when unknown: then nothing is capped. */
  lastAired: EpisodeRef | null;
  /** Finished airing or cancelled: no more episodes are coming. */
  ended: boolean;
}

export type NextUp =
  | { kind: "next"; season: number; episode: number }
  /** Watched everything that has aired; more is on the way. */
  | { kind: "waiting" }
  | { kind: "finished" };

type TVDetails = Awaited<ReturnType<typeof getTVDetails>>;
type AnimeDetails = Awaited<ReturnType<typeof getAnimeDetails>>;

export function tvGuide(show: TVDetails): EpisodeGuide {
  const last = show.last_episode_to_air;
  return {
    // Season 0 is TMDB's "Specials": not part of the watch order.
    seasons: (show.seasons ?? [])
      .filter((s) => s.season_number > 0 && s.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((s) => ({ number: s.season_number, episodes: s.episode_count })),
    lastAired: last ? { season: last.season_number, episode: last.episode_number } : null,
    ended: show.status === "Ended" || show.status === "Canceled",
  };
}

export function animeGuide(anime: AnimeDetails): EpisodeGuide {
  // Long-running shows have no episode total, only the next one to air.
  const aired = anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : null;
  return {
    seasons: [{ number: 1, episodes: anime.episodes ?? aired }],
    lastAired: aired != null ? { season: 1, episode: aired } : null,
    ended: anime.status === "FINISHED" || anime.status === "CANCELLED",
  };
}

const isAfter = (a: EpisodeRef, b: EpisodeRef) =>
  a.season > b.season || (a.season === b.season && a.episode > b.episode);

/** The episode after `watched`, or the first one when nothing is watched yet. */
export function nextEpisode(guide: EpisodeGuide, watched: EpisodeRef | null): NextUp {
  const noMore: NextUp = guide.ended ? { kind: "finished" } : { kind: "waiting" };

  let candidate: EpisodeRef | null = null;
  if (!watched) {
    const first = guide.seasons[0];
    if (first) candidate = { season: first.number, episode: 1 };
  } else {
    const current = guide.seasons.find((s) => s.number === watched.season);
    if (current && (current.episodes == null || watched.episode < current.episodes)) {
      candidate = { season: watched.season, episode: watched.episode + 1 };
    } else {
      // End of the season, or a season the guide no longer lists: the next
      // season along, from its first episode.
      const later = guide.seasons.find((s) => s.number > watched.season);
      if (later) candidate = { season: later.number, episode: 1 };
    }
  }

  if (!candidate) return noMore;
  if (guide.lastAired && isAfter(candidate, guide.lastAired)) return noMore;
  return { kind: "next", ...candidate };
}

/** "S2 · E5" for series; anime has no seasons, so just "Ep 5". */
export function episodeLabel(ref: EpisodeRef, type: "tv" | "anime") {
  return type === "anime" ? `Ep ${ref.episode}` : `S${ref.season} · E${ref.episode}`;
}
