import { posterUrl, type TMDBMovie, type TMDBTVShow } from "@/lib/tmdb";
import { getAnimeTitle, type AniListMedia } from "@/lib/anilist";
import type { MediaCardItem } from "@/components/media-card";

// One place that turns API results into grid cards, so the home page, browse
// grids, recommendations, the mood picker and collections all agree.

export function movieToCard(m: TMDBMovie): MediaCardItem {
  return {
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  };
}

export function tvToCard(t: TMDBTVShow): MediaCardItem {
  return {
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  };
}

export function animeToCard(a: AniListMedia): MediaCardItem {
  return {
    id: a.id,
    title: getAnimeTitle(a),
    posterUrl: a.coverImage.extraLarge,
    year: a.seasonYear ? String(a.seasonYear) : null,
    rating: a.averageScore,
    type: "anime",
  };
}
