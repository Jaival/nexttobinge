import { discoverMovies, discoverTV } from "@/lib/tmdb";
import { discoverAnime, type AnimeDiscoverOptions } from "@/lib/anilist";
import { animeToCard, movieToCard, tvToCard } from "@/lib/media-cards";
import type { MediaCardItem } from "@/components/media-card";

// Curated lists, defined as config rather than code: adding a collection means
// adding an entry here, and its page, sitemap entry and index card follow.
// Each is written to match a search people actually type ("best anime under
// 13 episodes"), which the generic browse grids never will.

type Source =
  | { kind: "movie"; params: Record<string, string> }
  | { kind: "tv"; params: Record<string, string> }
  | { kind: "anime"; params: AnimeDiscoverOptions };

export interface Collection {
  slug: string;
  title: string;
  description: string;
  source: Source;
}

const YEAR = new Date().getFullYear();

// Keeps animated films out of lists that are about something else.
const NOT_ANIMATED = { without_genres: "16" };

export const COLLECTIONS: Collection[] = [
  {
    slug: "best-anime-under-13-episodes",
    title: "Best anime under 13 episodes",
    description: "Top-rated anime you can finish in a weekend: 13 episodes or fewer.",
    source: {
      kind: "anime",
      params: { sort: "SCORE_DESC", formats: ["TV", "ONA"], maxEpisodes: 14, minPopularity: 20000 },
    },
  },
  {
    slug: "best-anime-movies",
    title: "Best anime movies",
    description: "The highest-rated anime films, from Ghibli classics to the latest blockbusters.",
    source: { kind: "anime", params: { sort: "SCORE_DESC", formats: ["MOVIE"], minPopularity: 20000 } },
  },
  {
    // The title carries the year, the slug doesn't, so the URL keeps its search
    // ranking from one year to the next. YEAR is read when the server starts,
    // so the title rolls over on the first deploy of the new year.
    slug: "best-movies-this-year",
    title: `Best movies of ${YEAR}`,
    description: `The best-reviewed movies released in ${YEAR} so far.`,
    source: {
      kind: "movie",
      params: { primary_release_year: String(YEAR), sort_by: "vote_average.desc", "vote_count.gte": "800" },
    },
  },
  {
    slug: "top-k-dramas",
    title: "Top K-dramas",
    description: "The highest-rated Korean drama series.",
    source: {
      kind: "tv",
      params: {
        with_original_language: "ko",
        with_genres: "18",
        without_genres: "16|10764|10767",
        sort_by: "vote_average.desc",
        "vote_count.gte": "150",
      },
    },
  },
  {
    slug: "movies-under-90-minutes",
    title: "Great movies under 90 minutes",
    description: "Acclaimed films that fit in a weeknight, from 60 to 90 minutes long.",
    source: {
      kind: "movie",
      params: {
        "with_runtime.gte": "60",
        "with_runtime.lte": "90",
        sort_by: "vote_average.desc",
        "vote_count.gte": "2000",
      },
    },
  },
  {
    slug: "best-animated-movies",
    title: "Best animated movies",
    description: "The highest-rated animated films of all time.",
    source: {
      kind: "movie",
      params: { with_genres: "16", sort_by: "vote_average.desc", "vote_count.gte": "2000" },
    },
  },
  {
    slug: "best-sci-fi-movies",
    title: "Best sci-fi movies",
    description: "Science fiction at its best: space epics, time loops and mind-benders.",
    source: {
      kind: "movie",
      params: { ...NOT_ANIMATED, with_genres: "878", sort_by: "vote_average.desc", "vote_count.gte": "3000" },
    },
  },
  {
    slug: "best-horror-movies",
    title: "Best horror movies",
    description: "The horror films critics and audiences rate highest, classics included.",
    source: {
      kind: "movie",
      params: { ...NOT_ANIMATED, with_genres: "27", sort_by: "vote_average.desc", "vote_count.gte": "2000" },
    },
  },
  {
    slug: "best-comedy-series",
    title: "Best comedy series",
    description: "The highest-rated English-language sitcoms and comedy series.",
    source: {
      kind: "tv",
      params: {
        with_genres: "35",
        with_original_language: "en",
        without_genres: "16|10764|10767|10762|10751|18",
        sort_by: "vote_average.desc",
        "vote_count.gte": "500",
      },
    },
  },
  {
    slug: "japanese-cinema-classics",
    title: "Japanese cinema classics",
    description: "Kurosawa, Ozu and the rest of Japan's best-rated live-action films.",
    source: {
      kind: "movie",
      params: {
        ...NOT_ANIMATED,
        with_original_language: "ja",
        sort_by: "vote_average.desc",
        "vote_count.gte": "500",
      },
    },
  },
];

export function getCollection(slug: string) {
  return COLLECTIONS.find((c) => c.slug === slug);
}

/** Two pages of TMDB results (20 each) or 40 from AniList. */
export async function getCollectionItems({ source }: Collection): Promise<MediaCardItem[]> {
  if (source.kind === "anime") {
    const data = await discoverAnime({ ...source.params, perPage: 40 });
    return data.media.map(animeToCard);
  }
  const pages = await Promise.all(
    ["1", "2"].map((page) =>
      source.kind === "movie"
        ? discoverMovies({ ...source.params, page }).then((d) => d.results.map(movieToCard))
        : discoverTV({ ...source.params, page }).then((d) => d.results.map(tvToCard))
    )
  );
  return pages.flat();
}
